(function () {

    var global = window;
    if (!global.sense)
        global.sense = {};

    var ns = {};
    global.sense.utils = ns;

    var sense = global.sense;

    ROW_PARSE_MODE = {
        REQUEST_START: 2,
        IN_REQUEST: 4,
        MULTI_DOC_CUR_DOC_END: 8,
        REQUEST_END: 16,
        BETWEEN_REQUESTS: 32
    };

    getRowParseMode = function (row, editor) {
        editor = editor || sense.editor;
        if (row == null || typeof row == "undefined") row = editor.getCursorPosition().row;

        var session = editor.getSession();
        if (row >= session.getLength()) return ROW_PARSE_MODE.BETWEEN_REQUESTS;
        var mode = (session.getState(row) || {}).name;
        if (!mode)
            return ROW_PARSE_MODE.BETWEEN_REQUESTS; // shouldn't really happen


        if (mode != "start") return ROW_PARSE_MODE.IN_REQUEST;
        var line = (session.getLine(row) || "").trim();
        if (!line || line[0] === '#') return ROW_PARSE_MODE.BETWEEN_REQUESTS; // empty line or a comment waiting for a new req to start

        if (line.indexOf("}", line.length - 1) >= 0) {
            // check for a multi doc request (must start a new json doc immediately after this one end.
            row++;
            if (row < session.getLength()) {
                line = (session.getLine(row) || "").trim();
                if (line.indexOf("{") == 0) { // next line is another doc in a multi doc
                    return ROW_PARSE_MODE.MULTI_DOC_CUR_DOC_END | ROW_PARSE_MODE.IN_REQUEST;
                }

            }
            return ROW_PARSE_MODE.REQUEST_END | ROW_PARSE_MODE.MULTI_DOC_CUR_DOC_END; // end of request
        }

        // check for single line requests
        row++;
        if (row >= session.getLength()) {
            return ROW_PARSE_MODE.REQUEST_START | ROW_PARSE_MODE.REQUEST_END;
        }
        line = (session.getLine(row) || "").trim();
        if (line.indexOf("{") != 0) { // next line is another request
            return ROW_PARSE_MODE.REQUEST_START | ROW_PARSE_MODE.REQUEST_END;
        }

        return ROW_PARSE_MODE.REQUEST_START;
    };

    function rowPredicate(row, editor, value) {
        var mode = getRowParseMode(row, editor);
        return (mode & value) > 0;
    }

    ns.isEndRequestRow = function (row, editor) {
        return rowPredicate(row, editor, ROW_PARSE_MODE.REQUEST_END);
    };

    ns.isRequestEdge = function (row, editor) {
        return rowPredicate(row, editor, ROW_PARSE_MODE.REQUEST_END | ROW_PARSE_MODE.REQUEST_START);
    };


    ns.isStartRequestRow = function (row, editor) {
        return rowPredicate(row, editor, ROW_PARSE_MODE.REQUEST_START);
    };

    ns.isInBetweenRequestsRow = function (row, editor) {
        return rowPredicate(row, editor, ROW_PARSE_MODE.BETWEEN_REQUESTS);
    };

    ns.isInRequestsRow = function (row, editor) {
        return rowPredicate(row, editor, ROW_PARSE_MODE.IN_REQUEST);
    };

    ns.isMultiDocDocEndRow = function (row, editor) {
        return rowPredicate(row, editor, ROW_PARSE_MODE.MULTI_DOC_CUR_DOC_END);
    };


    ns.iterForCurrentLoc = function (editor) {
        editor = editor || sense.editor;
        var pos = editor.getCursorPosition();
        return ns.iterForPosition(pos.row, pos.column, editor);
    };

    ns.iterForPosition = function (row, column, editor) {
        editor = editor || sense.editor;
        return new (ace.require("ace/token_iterator").TokenIterator)(editor.getSession(), row, column);
    };

    ns.isEmptyToken = function (tokenOrTokenIter) {
        var token = tokenOrTokenIter && tokenOrTokenIter.getCurrentToken ? tokenOrTokenIter.getCurrentToken() : tokenOrTokenIter;
        return !token || token.type == "whitespace"
    };

    ns.isUrlOrMethodToken = function (tokenOrTokenIter) {
        var t = tokenOrTokenIter.getCurrentToken ? tokenOrTokenIter.getCurrentToken() : tokenOrTokenIter;
        return t && t.type && (t.type == "method" || t.type.indexOf("url") == 0);
    };


    ns.nextNonEmptyToken = function (tokenIter) {
        var t = tokenIter.stepForward();
        while (t && ns.isEmptyToken(t)) t = tokenIter.stepForward();
        return t;
    };

    ns.prevNonEmptyToken = function (tokenIter) {
        var t = tokenIter.stepBackward();
        // empty rows return null token.
        while ((t || tokenIter.getCurrentTokenRow() > 0) && ns.isEmptyToken(t)) t = tokenIter.stepBackward();
        return t;
    };

    ns.prevRequestStart = function (pos, editor) {
        editor = editor || sense.editor;
        pos = pos || editor.getCursorPosition();
        var curRow = pos.row;
        while (curRow > 0 && !ns.isStartRequestRow(curRow, editor)) curRow--;

        return { row: curRow, column: 0};
    };

    ns.nextRequestEnd = function (pos, editor) {
        editor = editor || sense.editor;
        pos = pos || editor.getCursorPosition();
        var session = editor.getSession();
        var curRow = pos.row;
        var maxLines = session.getLength();
        for (; curRow < maxLines - 1; curRow++) {
            var curRowMode = getRowParseMode(curRow, editor);
            if ((curRowMode & ROW_PARSE_MODE.REQUEST_END) > 0) break;
            if (curRow != pos.row && (curRowMode & ROW_PARSE_MODE.REQUEST_START) > 0) break;
        }

        var column = (session.getLine(curRow) || "").length;

        return { row: curRow, column: column};
    };

    ns.nextDataDocEnd = function (pos, editor) {
        editor = editor || sense.editor;
        pos = pos || editor.getCursorPosition();
        var session = editor.getSession();
        var curRow = pos.row;
        var maxLines = session.getLength();
        for (; curRow < maxLines - 1; curRow++) {
            var curRowMode = getRowParseMode(curRow, editor);
            if ((curRowMode & ROW_PARSE_MODE.REQUEST_END) > 0) {
                break;
            }
            if ((curRowMode & ROW_PARSE_MODE.MULTI_DOC_CUR_DOC_END) > 0) break;
            if (curRow != pos.row && (curRowMode & ROW_PARSE_MODE.REQUEST_START) > 0) break;
        }

        var column = (session.getLine(curRow) || "").length;

        return { row: curRow, column: column };
    };


    ns.getCurrentRequestRange = function (editor) {
        if (ns.isInBetweenRequestsRow(null, editor)) return null;

        var reqStart = ns.prevRequestStart(null, editor);
        var reqEnd = ns.nextRequestEnd(reqStart, editor);
        return new (ace.require("ace/range").Range)(
            reqStart.row, reqStart.column,
            reqEnd.row, reqEnd.column
        );
    };

    ns.getCurrentRequest = function (editor) {
        editor = editor || sense.editor;

        if (ns.isInBetweenRequestsRow(null, editor)) return null;

        var request = {
            method: "",
            data: [],
            url: null
        };

        var currentReqRange = ns.getCurrentRequestRange(editor);

        var pos = currentReqRange.start;
        var tokenIter = ns.iterForPosition(pos.row, pos.column, editor);
        var t = tokenIter.getCurrentToken();
        request.method = t.value;
        t = ns.nextNonEmptyToken(tokenIter);
        if (!t || t.type == "method") return null;
        request.url = "";
        while (t && t.type && t.type.indexOf("url") == 0) {
            request.url += t.value;
            t = tokenIter.stepForward();
        }

        var bodyStartRow = (t ? 0 : 1) + tokenIter.getCurrentTokenRow(); // artificially increase end of docs.
        var bodyStartColumn = 0;
        while (bodyStartRow < currentReqRange.end.row ||
            (bodyStartRow == currentReqRange.end.row &&
                bodyStartColumn < currentReqRange.end.column
                )) {
            dataEndPos = ns.nextDataDocEnd({ row: bodyStartRow, column: bodyStartColumn}, editor);
            var bodyRange = new (ace.require("ace/range").Range)(
                bodyStartRow, bodyStartColumn,
                dataEndPos.row, dataEndPos.column
            );
            var data = editor.getSession().getTextRange(bodyRange);
            request.data.push(data.trim());
            bodyStartRow = dataEndPos.row + 1;
            bodyStartColumn = 0;
        }
        return request;
    };

    ns.textFromRequest = function (request) {
        var data = request.data;
        if (typeof data != "string") {
            data = data.join("\n");
        }
        return request.method + " " + request.url + "\n" + data;
    };

    ns.replaceCurrentRequest = function (newRequest, curRequestRange) {
        if (!curRequestRange)  curRequestRange = ns.getCurrentRequestRange();
        var text = ns.textFromRequest(newRequest);
        if (curRequestRange) {
            sense.editor.getSession().replace(curRequestRange, text);
        }
        else {
            // just insert where we are
            sense.editor.insert(text);
        }
    };

    ns.getUrlParam = function (name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    };

    ns.isTokenizationStable = function (editor) {
        editor = editor || sense.editor;
        return !editor.getSession().bgTokenizer.running;
    };

    ns.updateEditorAndCallWhenUpdated = function (data, editor, callback) {
        editor = editor || sense.editor;
        var session = editor.getSession();

        function mycallback() {
            session.removeListener(mycallback);
            if (session.bgTokenizer.running) {
                setTimeout(mycallback, 50); // wait
                return;
            }
            callback();
        }

        session.on('tokenizerUpdate', mycallback);
        session.setValue(data);
    }

})();