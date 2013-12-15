if (!sense)
    sense = { };

sense.VERSION = "0.9.0";

function autoRetryIfTokenizing(func, cancelAlreadyScheduledCalls) {
    var timer = false;
    var wrapper;
    wrapper = function () {

        if (!sense.utils.isTokenizationStable()) {
            var self = this;
            var args = arguments;
            if (cancelAlreadyScheduledCalls && typeof timer == "number") {
                clearTimeout(timer);
            }
            timer = setTimeout(function () {
                wrapper.apply(self, args)
            }, 100);
            return undefined;
        }
        timer = true;
        try {
            // now call the original method
            return func.apply(this, arguments);
        }
        finally {
            timer = false;
        }
    }
    return wrapper;
}

function resetToValues(server, content) {
    if (server != null) {
        $("#es_server").val(server);
        sense.mappings.notifyServerChange(server);
    }
    if (content != null) sense.editor.getSession().setValue(content);
    sense.output.getSession().setValue("");

}

function constructESUrl(server, url) {
    if (url.indexOf("://") >= 0) return url;
    if (server.indexOf("://") < 0) server = "http://" + server;
    if (server.substr(-1) == "/") {
        server = server.substr(0, server.length - 1);
    }
    if (url.charAt(0) === "/") url = url.substr(1);

    return server + "/" + url;
}

function callES(server, url, method, data, successCallback, completeCallback) {

    url = constructESUrl(server, url);
    var uname_password_re = /^(https?:\/\/)?(?:(?:([^\/]*):)?([^\/]*?)@)?(.*)$/;
    var url_parts = url.match(uname_password_re);

    var uname = url_parts[2];
    var password = url_parts[3];
    url = url_parts[1] + url_parts[4];
    console.log("Calling " + url + "  (uname: " + uname + " pwd: " + password + ")");
    if (data && method == "GET") method = "POST";

    $.ajax({
        url: url,
        data: method == "GET" ? null : data,
//      xhrFields: {
//            withCredentials: true
//      },
//      headers: {
//         "Authorization": "Basic " + btoa(uname + ":" + password)
//      },
//      beforeSend: function(xhr){
//         xhr.withCredentials = true;
//         xhr.setRequestHeader("Authorization", "Basic " + btoa(uname + ":" + password));
//      },

        password: password,
        username: uname,
        crossDomain: true,
        type: method,
        dataType: "json",
        complete: completeCallback,
        success: successCallback
    });
}

function submitCurrentRequestToES() {
    var req = sense.utils.getCurrentRequest();
    if (!req) return;

    $("#notification").text("Calling ES....").css("visibility", "visible");
    sense.output.getSession().setValue('');

    var es_server = $("#es_server").val(),
        es_url = req.url,
        es_method = req.method,
        es_data = req.data.join("\n");
    if (es_data) es_data += "\n"; //append a new line for bulk requests.

    callES(es_server, es_url, es_method, es_data, null, function (xhr, status) {
            $("#notification").text("").css("visibility", "hidden");
            if (typeof xhr.status == "number" &&
                ((xhr.status >= 400 && xhr.status < 600) ||
                    (xhr.status >= 200 && xhr.status < 300)
                    )) {
                // we have someone on the other side. Add to history
                sense.history.addToHistory(es_server, es_url, es_method, es_data);


                var value = xhr.responseText;
                try {
                    value = JSON.stringify(JSON.parse(value), null, 3);
                }
                catch (e) {

                }
                sense.output.getSession().setValue(value);
            }
            else {
                sense.output.getSession().setValue("Request failed to get to the server (status code: " + xhr.status + "):" + xhr.responseText);
            }

        }
    );

    saveEditorState();

    _gaq.push(['_trackEvent', "elasticsearch", 'query']);
}

submitCurrentRequestToES = autoRetryIfTokenizing(submitCurrentRequestToES);

function reformatData(data, indent) {
    var changed = false;
    var formatted_data = [];
    for (var i = 0; i < data.length; i++) {
        var cur_doc = data[i];
        try {
            var new_doc = JSON.stringify(JSON.parse(cur_doc), null, indent ? 3 : 0);
            changed = changed || new_doc != cur_doc;
            formatted_data.push(new_doc);
        }
        catch (e) {
            console.log(e);
            formatted_data.push(cur_doc);
        }
    }

    return { changed: changed, data: formatted_data}
}


function autoIndent() {
    var req_range = sense.utils.getCurrentRequestRange();
    if (!req_range) return;
    var parsed_req = sense.utils.getCurrentRequest();
    if (parsed_req.data && parsed_req.data.length > 0) {
        var indent = parsed_req.data.length == 1; // unindent multi docs by default
        var formatted_data = reformatData(parsed_req.data, indent);
        if (!formatted_data.changed) {
            // toggle.
            formatted_data = reformatData(parsed_req.data, !indent);
        }
        parsed_req.data = formatted_data.data;

        sense.utils.replaceCurrentRequest(parsed_req, req_range);
    }
}

autoIndent = autoRetryIfTokenizing(autoIndent);

function copyToClipboard(value) {
    var currentActive = document.activeElement;
    var clipboardStaging = $("#clipboardStaging");
    clipboardStaging.val(value);
    clipboardStaging.select();
    document.execCommand("Copy", false);
    $(currentActive).focus(); // restore focus.
}

function copyAsCURL() {
    var req = sense.utils.getCurrentRequest();
    if (!req) return;

    _gaq.push(['_trackEvent', "curl", 'copied']);

    var es_server = $("#es_server").val(),
        es_url = req.url,
        es_method = req.method,
        es_data = req.data;

    var url = constructESUrl(es_server, es_url);

    var curl = 'curl -X' + es_method + ' "' + url + '"';
    if (es_data && es_data.length) {
        curl += " -d'\n";
        // since Sense doesn't allow single quote json string any single qoute is within a string.
        curl += es_data.join("\n").replace(/'/g, '\\"');
        if (es_data.length > 1) curl += "\n"; // end with a new line
        curl += "'";
    }

    //console.log(curl);
    copyToClipboard(curl);

}

copyAsCURL = autoRetryIfTokenizing(copyAsCURL, true);


function handleCURLPaste(text) {
    _gaq.push(['_trackEvent', "curl", 'pasted']);
    var curlInput = sense.curl.parseCURL(text);
    if ($("#es_server").val()) curlInput.server = null; // do not override server

    if (!curlInput.method) curlInput.method = "GET";

    sense.editor.insert(sense.utils.textFromRequest(curlInput));

}


var CURRENT_REQ_RANGE = null;


function saveEditorState() {
    try {
        var content = sense.editor.getValue();
        var server = $("#es_server").val();
        sense.history.saveCurrentEditorState(server, content);
    }
    catch (e) {
        console.log("Ignoring saving error: " + e)
    }
}

function updateEditorActionsBar() {
    var editor_actions = $("#editor_actions");

    if (CURRENT_REQ_RANGE) {
        var row = CURRENT_REQ_RANGE.start.row;
        var column = CURRENT_REQ_RANGE.start.column;
        var session = sense.editor.session;
        var firstLine = session.getLine(row);
        var offset = 0;
        if (firstLine.length > session.getScreenWidth() - 5) {
            // overlap first row
            if (row > 0) row--; else row++;
        }
        var screen_pos = sense.editor.renderer.textToScreenCoordinates(row, column);
        offset += screen_pos.pageY - 3;
        var end_offset = sense.editor.renderer.textToScreenCoordinates(CURRENT_REQ_RANGE.end.row,
            CURRENT_REQ_RANGE.end.column).pageY;

        offset = Math.min(end_offset, Math.max(offset, 47));
        if (offset >= 47) {
            editor_actions.css("top", Math.max(offset, 47));
            editor_actions.css('visibility', 'visible');
        }
        else {
            editor_actions.css("top", 0);
            editor_actions.css('visibility', 'hidden');
        }
    }
    else {
        editor_actions.css("top", 0);
        editor_actions.css('visibility', 'hidden');
    }

}

function highlighCurrentRequestAndUpdateActionBar() {
    var session = sense.editor.getSession();
    var new_current_req_range = sense.utils.getCurrentRequestRange();
    if (new_current_req_range == null && CURRENT_REQ_RANGE == null) return;
    if (new_current_req_range != null && CURRENT_REQ_RANGE != null &&
        new_current_req_range.start.row == CURRENT_REQ_RANGE.start.row &&
        new_current_req_range.end.row == CURRENT_REQ_RANGE.end.row
        ) {
        // same request, now see if we are on the first line and update the action bar
        var cursorRow = sense.editor.getCursorPosition().row;
        if (cursorRow == CURRENT_REQ_RANGE.start.row) {
            updateEditorActionsBar();
        }
        return; // nothing to do..
    }

    if (CURRENT_REQ_RANGE) {
        session.removeMarker(CURRENT_REQ_RANGE.marker_id);
    }

    CURRENT_REQ_RANGE = new_current_req_range;
    if (CURRENT_REQ_RANGE) {
        CURRENT_REQ_RANGE.marker_id = session.addMarker(CURRENT_REQ_RANGE, "ace_snippet-marker", "text");
    }
    updateEditorActionsBar();
}

highlighCurrentRequestAndUpdateActionBar = autoRetryIfTokenizing(highlighCurrentRequestAndUpdateActionBar, true);

function moveToPreviousRequestEdge() {
    var pos = sense.editor.getCursorPosition();
    for (pos.row--; pos.row > 0 && !sense.utils.isRequestEdge(pos.row); pos.row--) {
    }
    sense.editor.moveCursorTo(pos.row, 0);
}

moveToPreviousRequestEdge = autoRetryIfTokenizing(moveToPreviousRequestEdge);


function moveToNextRequestEdge() {
    var pos = sense.editor.getCursorPosition();
    var maxRow = sense.editor.getSession().getLength();
    for (pos.row++; pos.row < maxRow && !sense.utils.isRequestEdge(pos.row); pos.row++) {
    }
    sense.editor.moveCursorTo(pos.row, 0);
}

moveToNextRequestEdge = autoRetryIfTokenizing(moveToNextRequestEdge);

function init() {

    sense.editor = ace.edit("editor");
    ace.require("ace/mode/sense");
    sense.editor.getSession().setMode("ace/mode/sense");
    sense.editor.setShowPrintMargin(false);
    sense.editor.getSession().setFoldStyle('markbeginend');
    sense.editor.getSession().setUseWrapMode(true);
    sense.editor.commands.addCommand({
        name: 'autocomplete',
        bindKey: {win: 'Ctrl-Space', mac: 'Ctrl-Space'},
        exec: sense.autocomplete.editorAutocompleteCommand
    });
    sense.editor.commands.addCommand({
        name: 'auto indent request',
        bindKey: {win: 'Ctrl-I', mac: 'Command-I'},
        exec: autoIndent
    });
    sense.editor.commands.addCommand({
        name: 'send to elasticsearch',
        bindKey: {win: 'Ctrl-Enter', mac: 'Command-Enter'},
        exec: submitCurrentRequestToES
    });

    sense.editor.commands.addCommand({
        name: 'copy as cUrl',
        bindKey: {win: 'Ctrl-Shift-C', mac: 'Command-Shift-C'},
        exec: copyAsCURL
    });

    sense.editor.commands.addCommand({
        name: 'move to previous request start or end',
        bindKey: {win: 'Ctrl-Up', mac: 'Command-Up'},
        exec: moveToPreviousRequestEdge
    });

    sense.editor.commands.addCommand({
        name: 'move to next request start or end',
        bindKey: {win: 'Ctrl-Down', mac: 'Command-Down'},
        exec: moveToNextRequestEdge
    });


    var orig_paste = sense.editor.onPaste;
    sense.editor.onPaste = function (text) {
        if (text && sense.curl.detectCURL(text)) {
            handleCURLPaste(text);
            return;
        }
        orig_paste.call(this, text);
    };

    sense.editor.getSession().on('tokenizerUpdate', function (e) {
        highlighCurrentRequestAndUpdateActionBar();
    });

    sense.editor.getSession().selection.on('changeCursor', function (e) {
        highlighCurrentRequestAndUpdateActionBar();
    });


    var save_generation = 0;

    function get_save_callback(for_generation) {
        return function () {
            if (save_generation == for_generation) {
                saveEditorState();
            }
        }
    }

    sense.editor.getSession().on("change", function (e) {
        setTimeout(get_save_callback(++save_generation), 500);
    });

    sense.editor.getSession().on("changeScrollTop", updateEditorActionsBar);


    sense.output = ace.edit("output");
    sense.output.getSession().setMode("ace/mode/json");
    sense.output.getSession().setFoldStyle('markbeginend');
    sense.output.getSession().setUseWrapMode(true);
    sense.output.setShowPrintMargin(false);
    sense.output.setReadOnly(true);

    var editorElement = $("#editor"),
        outputElement = $("#output"),
        editorActions = $("#editor_actions");


    editorElement.resizable(
        {
            autoHide: false,
            handles: 'e',
            start: function (e, ui) {
                editor_resizebar = $(".ui-resizable-e").addClass("active");
            },
            stop: function (e, ui) {
                editor_resizebar = $(".ui-resizable-e").removeClass("active");

                var parent = ui.element.parent();
                var editorSize = ui.element.outerWidth();
                outputElement.css("left", editorSize+20);
                editorActions.css("margin-right", -editorSize + 3);
                sense.editor.resize(true);
                sense.output.resize(true);
            }
        });

    sense.history.init();
    sense.autocomplete.init();
    sense.settings.init();

    $("#send").tooltip();
    $("#send").click(function () {
        submitCurrentRequestToES();
        return false;
    });

    $("#copy_as_curl").click(function (e) {
        copyAsCURL();
        e.preventDefault();
    });

    $("#auto_indent").click(function (e) {
        autoIndent();
        e.preventDefault();
    });

    var help_popup = $("#help_popup");

    help_popup.on('shown', function () {
        _gaq.push(['_trackEvent', "help", 'shown']);
        $('<div id="example_editor">PUT index/type/1\n'
            + '{\n'
            + '   "body": "here"\n'
            + '}\n\n'
            + 'GET index/type/1\n'
            + '</div>').appendTo(help_popup.find("#example_editor_container"));

        var example_editor = ace.edit("example_editor");
        example_editor.getSession().setMode("ace/mode/sense");
        example_editor.getSession().setFoldStyle('markbeginend');
        example_editor.setReadOnly(true);
        example_editor.renderer.setShowPrintMargin(false);
    });

    help_popup.on('hidden', function () {
        help_popup.find('#example_editor').remove();

    });


    var es_server = $("#es_server");

    es_server.blur(function () {
        sense.mappings.notifyServerChange(es_server.val());
    });

    var editor_source = sense.utils.getUrlParam('load_from') || "stored";
    var last_editor_state = sense.history.getSavedEditorState();
    if (editor_source == "stored") {
        if (last_editor_state) {
            resetToValues(last_editor_state.server, last_editor_state.content);
        }
        else {
            autoIndent();
        }
    }
    else if (/^https?:\/\//.exec(editor_source)) {
        $.get(editor_source, null, function (data) {
            resetToValues(null, data);
            highlighCurrentRequestAndUpdateActionBar();
            updateEditorActionsBar();
        });
    }
    else {
        if (last_editor_state) {
            resetToValues(last_editor_state.server);
        }
    }

    if (document.location.pathname && document.location.pathname.indexOf("_plugin") == 1) {
        // running as an ES plugin. Always assume we are using that elasticsearch
        resetToValues(document.location.host);
    }

    sense.editor.focus();
    highlighCurrentRequestAndUpdateActionBar();
    updateEditorActionsBar();

    if (!localStorage.getItem("version_welcome_shown")) {
        localStorage.setItem("version_welcome_shown", sense.VERSION);
        var welcome_popup = $("#welcome_popup");
        welcome_popup.modal();
        welcome_popup.on('shown', function () {
            $('<div id="example_editor">PUT index/type/1\n'
                + '{\n'
                + '   "body": "here"\n'
                + '}\n\n'
                + 'GET index/type/1\n'
                + '</div>').appendTo(welcome_popup.find("#example_editor_container"));

            var example_editor = ace.edit("example_editor");
            example_editor.getSession().setMode("ace/mode/sense");
            example_editor.getSession().setFoldStyle('markbeginend');
            example_editor.setReadOnly(true);
            example_editor.renderer.setShowPrintMargin(false);
        });

        welcome_popup.on('hidden', function () {
            welcome_popup.find('#example_editor').remove();

        });
        //  welcome_popup.modal('show');

    }
}

$(document).ready(init);

/* google analytics */
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-11830182-16']);
_gaq.push(['_setCustomVar',
    1,                // This custom var is set to slot #1.  Required parameter.
    'Version',    // The name of the custom variable.  Required parameter.
    sense.VERSION,        // The value of the custom variable.  Required parameter.
    1                 // Sets the scope to visitor-level.  Optional parameter.
]);

_gaq.push(['_trackPageview']);

(function () {
    var ga = document.createElement('script');
    ga.type = 'text/javascript';
    ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(ga, s);
})();

