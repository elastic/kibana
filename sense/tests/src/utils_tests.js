var sense = window.sense;
var utils = sense.utils;

module("Utils", {
    setup: function () {
        sense.tests = {};
        sense.tests.editor_div = $('<div id="editor"></div>').appendTo($('body'));
        sense.tests.editor = ace.edit("editor");
        ace.require("ace/mode/sense");
        sense.tests.editor.getSession().setMode("ace/mode/sense");
        sense.tests.editor.getSession().setValue("hello");

    },

    teardown: function () {
        sense.tests.editor_div.remove();
        sense.tests = {};
    }
});

var testCount = 0;

function utils_test(name, prefix, data, test) {
    if (data && typeof data != "string") data = JSON.stringify(data, null, 3);
    if (data) {
        if (prefix) data = prefix + "\n" + data;
    } else {
        data = prefix;
    }

    QUnit.asyncTest("Utils test " + testCount++ + ":" + name,
        function () {
            var editor = sense.tests.editor;
            utils.updateEditorAndCallWhenUpdated(data, editor, function () {
                test(editor);
                start();
            });

        });
}

var simple_request =
{ prefix: 'POST _search',
    data: '{\n' +
        '   "query": { "match_all": {} }\n' +
        '}'
};

var single_line_request =
{ prefix: 'POST _search',
    data: '{ "query": { "match_all": {} } }'
};


utils_test("simple request range", simple_request.prefix, simple_request.data,
    function (editor) {
        var range = utils.getCurrentRequestRange(editor);
        var expected = new (ace.require("ace/range").Range)(
            0, 0,
            3, 1
        );
        deepEqual(range, expected);
    }
);

utils_test("single line request range", single_line_request.prefix, single_line_request.data,
    function (editor) {
        var range = utils.getCurrentRequestRange(editor);
        var expected = new (ace.require("ace/range").Range)(
            0, 0,
            1, 32
        );
        deepEqual(range, expected);
    }
);

utils_test("simple request data", simple_request.prefix, simple_request.data,
    function (editor) {
        var request = utils.getCurrentRequest(editor);
        var expected = {
            method: "POST",
            url: "_search",
            data: [simple_request.data]
        };

        deepEqual(request, expected);
    }
);

utils_test("single line request data", single_line_request.prefix, single_line_request.data,
    function (editor) {
        var request = utils.getCurrentRequest(editor);
        var expected = {
            method: "POST",
            url: "_search",
            data: [single_line_request.data]
        };

        deepEqual(request, expected);
    }
);


var get_request_no_data =
{ prefix: 'GET _stats'
};

utils_test("request with no data followed by a new line", get_request_no_data.prefix, "\n",
    function (editor) {
        var range = utils.getCurrentRequestRange(editor);
        var expected = new (ace.require("ace/range").Range)(
            0, 0,
            0, 10
        );
        deepEqual(range, expected);
    }
);

utils_test("request with no data followed by a new line (data)", get_request_no_data.prefix, "\n",
    function (editor) {
        var range = utils.getCurrentRequest(editor);
        var expected = {
            method: "GET",
            url: "_stats",
            data: []
        };

        deepEqual(range, expected);
    }
);


utils_test("request with no data", get_request_no_data.prefix, get_request_no_data.data,
    function (editor) {
        var range = utils.getCurrentRequestRange(editor);
        var expected = new (ace.require("ace/range").Range)(
            0, 0,
            0, 10
        );
        deepEqual(range, expected);
    }
);

utils_test("request with no data (data)", get_request_no_data.prefix, get_request_no_data.data,
    function (editor) {
        var range = utils.getCurrentRequest(editor);
        var expected = {
            method: "GET",
            url: "_stats",
            data: []
        };

        deepEqual(range, expected);
    }
);


var multi_doc_request =
{ prefix: 'POST _bulk',
    data_as_array: ['{ "index": { "_index": "index", "_type":"type" } }',
        '{ "field": 1 }'
    ]
};
multi_doc_request.data = multi_doc_request.data_as_array.join("\n");

utils_test("multi doc request range", multi_doc_request.prefix, multi_doc_request.data,
    function (editor) {
        var range = utils.getCurrentRequestRange(editor);
        var expected = new (ace.require("ace/range").Range)(
            0, 0,
            2, 14
        );
        deepEqual(range, expected);
    }
);

utils_test("multi doc request data", multi_doc_request.prefix, multi_doc_request.data,
    function (editor) {
        var request = utils.getCurrentRequest(editor);
        var expected = {
            method: "POST",
            url: "_bulk",
            data: multi_doc_request.data_as_array
        };

        deepEqual(request, expected);
    }
);
