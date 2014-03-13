/*global module, test, equals, expect, ok, printStackTrace, CapturedExceptions */
/*jshint bitwise:true, curly:true, forin:true, latedef:true, noarg:true, noempty:true, nonew:true, undef:true, trailing:true, indent:4, browser:true */
//
//     Copyright (C) 2008 Loic Dachary <loic@dachary.org>
//     Copyright (C) 2008 Johan Euphrosine <proppy@aminche.com>
//     Copyright (C) 2010 Eric Wendelin <emwendelin@gmail.com>
//
//     This program is free software: you can redistribute it and/or modify
//     it under the terms of the GNU General Public License as published by
//     the Free Software Foundation, either version 3 of the License, or
//     (at your option) any later version.
//
//     This program is distributed in the hope that it will be useful,
//     but WITHOUT ANY WARRANTY; without even the implied warranty of
//     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//     GNU General Public License for more details.
//
//     You should have received a copy of the GNU General Public License
//     along with this program.  If not, see <http://www.gnu.org/licenses/>.
//

(function(window, document, undefined) {
    //region setup
    var pst = printStackTrace.implementation.prototype;

    var impl = function() {
        return new printStackTrace.implementation();
    };

    var ex;
    try {
        this.undef();
    } catch (exception) {
        ex = exception;
    }

    // Testing util functions
    var UnitTest = function() {
    };
    UnitTest.fn = UnitTest.prototype = {
        genericError: null,
        createGenericError: function() {
            if (UnitTest.prototype.genericError != null) {
                return UnitTest.prototype.genericError;
            }
            //return new Error("Generic error");
            return new Error();
        },
        createModeStub: function(mode) {
            return function() {
                ok(false, 'must not call run() for mode "' + mode + '"');
            };
        },
        createModeStubs: function(p, stub) {
            var modes = ['other', 'opera9', 'opera10a', 'opera10b', 'opera11', 'firefox', 'safari', 'ie', 'chrome'];
            for (var i = 0, len = modes.length; i < len; i++) {
                var mode = modes[i];
                p[mode] = stub || this.createModeStub(mode);
            }
        }
    };
    //endregion

    //region invocation
    module("invocation");

    test("printStackTrace", function() {
        expect(1);
        var r = printStackTrace();
        equals(r.constructor, Array, 'printStackTrace returns an array');
    });

    test("printStackTrace options", function() {
        expect(1);
        var guessAnonymousFunctions = pst.guessAnonymousFunctions;
        pst.guessAnonymousFunctions = function() {
            pst.guessAnonymousFunctions = guessAnonymousFunctions;
            ok(true, 'guessAnonymousFunctions called');
        };
        printStackTrace({
            guess: true
        });
    });
    //endregion

    //region mode
    module("mode");

    test("mode", function() {
        expect(1);
        equals("chrome safari firefox ie other opera9 opera10a opera10b opera11".indexOf(pst.mode(UnitTest.fn.createGenericError())) >= 0, true);
    });

    test("run mode", function() {
        expect(1);
        var p = impl();
        UnitTest.fn.createModeStubs(p, function() {
            ok(true, 'called mode() successfully');
        });
        p.run();
    });

    test("run chrome", function() {
        expect(2);
        var p = impl();
        UnitTest.fn.createModeStubs(p);
        p.chrome = function() {
            ok(true, 'called run() for "chrome"');
        };
        p.run(CapturedExceptions.chrome_15);
        p.run(CapturedExceptions.chrome_27);
    });

    test("run safari", function() {
        expect(1);
        var p = impl();
        UnitTest.fn.createModeStubs(p);
        p.safari = function() {
            ok(true, 'called run() for "safari"');
        };
        p.run(CapturedExceptions.safari_6);
    });

    test("run ie", function() {
        expect(1);
        var p = impl();
        UnitTest.fn.createModeStubs(p);
        p.ie = function() {
            ok(true, 'called run() for "ie"');
        };
        p.run(CapturedExceptions.ie_10);
    });

    test("run firefox", function() {
        expect(5);
        var p = impl();
        UnitTest.fn.createModeStubs(p);
        p.firefox = function() {
            ok(true, 'called run() for "firefox"');
        };
        p.run(CapturedExceptions.firefox_3_6);
        p.run(CapturedExceptions.firefox_3_6_file);
        p.run(CapturedExceptions.firefox_7);
        p.run(CapturedExceptions.firefox_14);
        p.run(CapturedExceptions.firefox_22);
    });

    test("run opera9", function() {
        expect(4);
        var p = impl();
        UnitTest.fn.createModeStubs(p);
        p.opera9 = function() {
            ok(true, 'called run() for "opera9"');
        };
        p.run(CapturedExceptions.opera_854);
        p.run(CapturedExceptions.opera_902);
        p.run(CapturedExceptions.opera_927);
        p.run(CapturedExceptions.opera_964);
    });

    test("run opera10a", function() {
        expect(1);
        var p = impl();
        UnitTest.fn.createModeStubs(p);
        p.opera10a = function() {
            ok(true, 'called run() for "opera10a"');
        };
        p.run(CapturedExceptions.opera_1010);
    });

    test("run opera10b", function() {
        expect(1);
        var p = impl();
        UnitTest.fn.createModeStubs(p);
        p.opera10b = function() {
            ok(true, 'called run() for "opera10b"');
        };
        p.run(CapturedExceptions.opera_1063);
    });

    test("run opera11", function() {
        expect(3);
        var p = impl();
        UnitTest.fn.createModeStubs(p);
        p.opera11 = function() {
            ok(true, 'called run() for "opera11"');
        };
        p.run(CapturedExceptions.opera_1111);
        p.run(CapturedExceptions.opera_1151);
        p.run(CapturedExceptions.opera_1216);
    });

    test("run other", function() {
        expect(1);
        var p = impl();
        UnitTest.fn.createModeStubs(p);
        p.other = function() {
            ok(true, 'called run() for other browser');
        };
        p.run({});
    });

    test("function instrumentation", function() {
        expect(4);
        this.toInstrument = function() {
            ok(true, 'called instrumented function');
        };
        this.callback = function(stacktrace) {
            ok(typeof stacktrace !== 'undefined', 'called callback');
        };
        pst.instrumentFunction(this, 'toInstrument', this.callback);
        ok(this.toInstrument._instrumented, 'function instrumented');
        this.toInstrument();
        pst.deinstrumentFunction(this, 'toInstrument');
        ok(!this.toInstrument._instrumented, 'function deinstrumented');
        this.toInstrument = this.callback = null;
    });

    test("firefox", function() {
        expect(34);

        var message = pst.firefox(CapturedExceptions.firefox_3_6);
        // equals(message.join('\n'), '', 'processed stack trace');
        equals(message.length, 7, 'Firefox 3.6: 7 stack entries');
        equals(message[0], '{anonymous}()@http://127.0.0.1:8000/js/stacktrace.js:44');
        equals(message[1], '{anonymous}(null)@http://127.0.0.1:8000/js/stacktrace.js:31');
        equals(message[2], 'printStackTrace()@http://127.0.0.1:8000/js/stacktrace.js:18');
        equals(message[3], 'bar(1)@http://127.0.0.1:8000/js/test/functional/testcase1.html:13');
        equals(message[4], 'bar(2)@http://127.0.0.1:8000/js/test/functional/testcase1.html:16');
        equals(message[5], 'foo()@http://127.0.0.1:8000/js/test/functional/testcase1.html:20');
        equals(message[6], '{anonymous}()@http://127.0.0.1:8000/js/test/functional/testcase1.html:24');

        message = pst.firefox(CapturedExceptions.firefox_3_6_file);
        equals(message.length, 7, 'Firefox 3.6: 7 stack entries');
        equals(message[0], '{anonymous}()@file:///home/user/js/stacktrace.js:44');
        equals(message[1], '{anonymous}(null)@file:///home/user/js/stacktrace.js:31');
        equals(message[2], 'printStackTrace()@file:///home/user/js/stacktrace.js:18');
        equals(message[3], 'bar(1)@file:///home/user/js/test/functional/testcase1.html:13');
        equals(message[4], 'bar(2)@file:///home/user/js/test/functional/testcase1.html:16');
        equals(message[5], 'foo()@file:///home/user/js/test/functional/testcase1.html:20');
        equals(message[6], '{anonymous}()@file:///home/user/js/test/functional/testcase1.html:24');

        message = pst.firefox(CapturedExceptions.firefox_7);
        equals(message.length, 7, 'Firefox 7: 7 stack entries');
        equals(message[0], '{anonymous}()@file:///G:/js/stacktrace.js:44');
        equals(message[1], '{anonymous}(null)@file:///G:/js/stacktrace.js:31');
        equals(message[2], 'printStackTrace()@file:///G:/js/stacktrace.js:18');
        equals(message[3], 'bar(1)@file:///G:/js/test/functional/testcase1.html:13');
        equals(message[4], 'bar(2)@file:///G:/js/test/functional/testcase1.html:16');
        equals(message[5], 'foo()@file:///G:/js/test/functional/testcase1.html:20');
        equals(message[6], '{anonymous}()@file:///G:/js/test/functional/testcase1.html:24');

        message = pst.firefox(CapturedExceptions.firefox_14);
        equals(message.length, 3, 'Firefox 14: 3 stack entries');
        equals(message[0], '{anonymous}()@file:///Users/eric/src/javascript-stacktrace/test/functional/ExceptionLab.html:48');
        equals(message[1], 'dumpException3@file:///Users/eric/src/javascript-stacktrace/test/functional/ExceptionLab.html:52');
        equals(message[2], 'onclick@file:///Users/eric/src/javascript-stacktrace/test/functional/ExceptionLab.html:1');

        message = pst.firefox(CapturedExceptions.firefox_22);
        equals(message.length, 5, 'Firefox 22: 7 stack entries');
        equals(message[0], '{anonymous}()@file:///E:/javascript-stacktrace/test/functional/ExceptionLab.js:4');
        equals(message[1], 'createException@file:///E:/javascript-stacktrace/test/functional/ExceptionLab.js:8');
        equals(message[2], 'createException4@file:///E:/javascript-stacktrace/test/functional/ExceptionLab.html:56');
        equals(message[3], 'dumpException4@file:///E:/javascript-stacktrace/test/functional/ExceptionLab.html:60');
        equals(message[4], 'onclick@file:///E:/javascript-stacktrace/test/functional/ExceptionLab.html:1');
    });

    if (pst.mode(ex) == 'firefox') {
        test("firefox live", function() {
            function f1(arg1, arg2) {
                try {
                    return this.undef();
                } catch (exception) {
                    return exception;
                }
            }

            var f2 = function() {
                return f1(1, "abc");
            };

            var e = (function() {
                return f2();
            })();

            expect(2);
            var message = pst.firefox(e);
            // equals(message.join('\n'), '', 'processed stack trace');
            equals(message[0].indexOf('f1@'), 0, message[0] + ' should start with f1@');
            equals(message[1].indexOf('f2@'), 0, message[1] + ' should start with f2@');
            //equals(message[2].indexOf('{anonymous}()@'), 0, message[2] + ' should start with {anonymous}()@');
        });
    }

    test("chrome", function() {
        expect(17);

        var message = pst.chrome(CapturedExceptions.chrome_15);
        // equals(message.join('\n'), '', 'processed stack trace');
        equals(message.length, 7, 'Chrome 15: 7 stack entries');
        equals(message[0], 'Object.createException@http://127.0.0.1:8000/js/stacktrace.js:42:18');
        equals(message[1], 'Object.run@http://127.0.0.1:8000/js/stacktrace.js:31:25');
        equals(message[2], 'printStackTrace@http://127.0.0.1:8000/js/stacktrace.js:18:62');
        equals(message[3], 'bar@http://127.0.0.1:8000/js/test/functional/testcase1.html:13:17');
        equals(message[4], 'bar@http://127.0.0.1:8000/js/test/functional/testcase1.html:16:5');
        equals(message[5], 'foo@http://127.0.0.1:8000/js/test/functional/testcase1.html:20:5');
        equals(message[6], '{anonymous}()@http://127.0.0.1:8000/js/test/functional/testcase1.html:24:4');

        message = pst.chrome(CapturedExceptions.chrome_27);
        equals(message.length, 5, 'Chrome 27: 5 stack entries');
        equals(message[0], '{anonymous}()@file:///E:/javascript-stacktrace/test/functional/ExceptionLab.js:4:9');
        equals(message[1], 'createException@file:///E:/javascript-stacktrace/test/functional/ExceptionLab.js:8:5');
        equals(message[2], 'createException4@file:///E:/javascript-stacktrace/test/functional/ExceptionLab.html:56:16');
        equals(message[3], 'dumpException4@file:///E:/javascript-stacktrace/test/functional/ExceptionLab.html:60:23');
        equals(message[4], 'HTMLButtonElement.onclick@file:///E:/javascript-stacktrace/test/functional/ExceptionLab.html:83:126');

        message = pst.chrome(CapturedExceptions.chrome_31_multiline_message);
        equals(message.length, 2, 'Chrome 31: 2 stack entries');
        equals(message[0], 'dumpException6@file:///E:/javascript-stacktrace/test/functional/ExceptionLab.html:82:20');
        equals(message[1], 'HTMLButtonElement.onclick@file:///E:/javascript-stacktrace/test/functional/ExceptionLab.html:101:122');
    });

    if (pst.mode(ex) == 'chrome') {
        test("chrome live", function() {
            function f1(arg1, arg2) {
                try {
                    return this.undef();
                } catch (exception) {
                    return exception;
                }
            }

            var f2 = function() {
                return f1(1, "abc");
            };

            var e = (function() {
                return f2();
            })();

            expect(3);
            var message = pst.chrome(e);
            //equals(e.stack, '', 'original stack trace');
            //equals(message.join('\n'), '', 'processed stack trace');
            equals(message[0].indexOf('f1@'), 0, message[0] + ' should start with f1@');
            equals(message[1].indexOf('f2@'), 0, message[1] + ' should start with f2@');
            equals(message[2].indexOf('{anonymous}()@'), 0, message[2] + ' should start with {anonymous}()@');
        });
    }

    test("opera9", function() {
        var mode = pst.mode(UnitTest.fn.createGenericError()), e = [];
        if (mode == 'opera9') {
            function discarded() {
                try {
                    this.undef();
                } catch (exception) {
                    e.push(exception);
                }
            }

            function f1(arg1, arg2) {
                discarded();
            }

            var f2 = function() {
                f1(1, "abc");
            };
            f2();
        }
        expect(3 * e.length);
        for (var i = 0; i < e.length; i++) {
            var message = pst.opera9(e[i]);
            var message_string = message.join("\n");
            //equals(message.join("\n"), 'debug', 'debug');
            //equals(message[0].indexOf('f1()') >= 0, true, 'f1 function name');
            equals(message[1].indexOf('discarded()') >= 0, true, 'discarded() statement in f1: ' + message[1]);
            equals(message[2].indexOf('{anonymous}()@') >= 0, true, 'f2 is anonymous: ' + message[2]);
            equals(message[2].indexOf('f1(1, "abc")') >= 0, true, 'f1() statement in f2: ' + message[2]);
        }
    });

    test("opera9", function() {
        var e = [CapturedExceptions.opera_854, CapturedExceptions.opera_902, CapturedExceptions.opera_927, CapturedExceptions.opera_964];
        expect(12); // 3 * e.length
        for (var i = 0; i < e.length; i++) {
            var message = pst.opera9(e[i]);
            //equals(message.join("\n"), 'debug', 'debug');
            equals(message.length, 7, 'number of stack entries');
            equals(message[0].indexOf('this.undef()') >= 0, true, 'this.undef() is at the top of stack');
            equals(message[message.length - 1].indexOf('foo()') >= 0, true, 'foo() is at the bottom of stack');
        }
    });

    test("opera10a", function() {
        var e = [CapturedExceptions.opera_1010];
        expect(5); // 5 * e.length
        for (var i = 0; i < e.length; i++) {
            var message = pst.opera10a(e[i]);
            //equals(message.join("\n"), 'debug', 'debug');
            equals(message.length, 7, 'number of stack entries');
            equals(message[0].indexOf('this.undef()') >= 0, true, 'this.undef() is at the top of stack');
            equals(message[message.length - 3].indexOf('bar(') >= 0, true, 'bar is 3rd from the bottom of stack');
            equals(message[message.length - 2].indexOf('bar(2)') >= 0, true, 'bar is 2nd from the bottom of stack');
            equals(message[message.length - 1].indexOf('foo()') >= 0, true, 'foo() is at the bottom of stack');
        }
    });

    test("opera10b", function() {
        var e = [CapturedExceptions.opera_1063];
        expect(3); // 3 * e.length
        for (var i = 0; i < e.length; i++) {
            var message = pst.opera10b(e[i]);
            //equals(message.join("\n"), 'debug', 'debug');
            equals(message.length, 7, 'number of stack entries');
            equals(message[0].indexOf('createException') >= 0, true, 'createException() is at the top of stack');
            equals(message[message.length - 2].indexOf('foo') >= 0, true, 'foo() is 2nd from the bottom of stack');
        }
    });

    test("opera11", function() {
        var e = [CapturedExceptions.opera_1111, CapturedExceptions.opera_1151];
        expect(6); // 3 * e.length
        for (var i = 0; i < e.length; i++) {
            var message = pst.opera11(e[i]);
            //equals(message.join("\n"), 'debug', 'debug');
            equals(message.length, 7, 'number of stack entries');
            equals(message[0].indexOf('createException') >= 0, true, 'createException() is at the top of stack');
            equals(message[message.length - 2].indexOf('foo') >= 0, true, 'foo() is 2nd from the bottom of stack');
        }
    });

    test("opera11", function() {
        var mode = pst.mode(UnitTest.fn.createGenericError());
        var e = [];
        if (mode == 'opera11') {
            function discarded() {
                try {
                    this.undef();
                } catch (exception) {
                    e.push(exception);
                }
            }

            function f1(arg1, arg2) {
                var blah = arg1;
                discarded();
            }

            var f2 = function() {
                f1(1, "abc");
            };
            f2();
        }
        expect(3 * e.length);
        for (var i = 0; i < e.length; i++) {
            var stack = pst.opera11(e[i]), stack_string = stack.join('\n');
            //equals(stack_string, 'debug', 'debug');
            equals(stack_string.indexOf('ignored'), -1, 'ignored');
            equals(stack[1].indexOf('f1(') >= 0, true, 'f1 function name: ' + stack[1]);
            equals(stack[2].indexOf('{anonymous}()') >= 0, true, 'f2 is anonymous: ' + stack[2]);
        }
    });

    test("safari", function() {
        var e = [], ex;

        function f0() {
            try {
                this.undef();
            } catch (exception) {
                ex = exception;
            }
        }

        function f1(arg1, arg2) {
            f0();
        }

        var f2 = function() {
            f1(1, "abc");
        };
        f2();
        if (pst.mode(ex) == 'safari') {
            e.push(ex);
        }
        expect(2 * e.length);
        for (var i = 0; i < e.length; i++) {
            var stack = pst.safari(e[i]), stack_string = stack.join('\n');
            //equals(stack_string, 'debug', 'debug');
            equals(stack[0].indexOf('f0') >= 0, true, 'matched f0');
            equals(stack[1].indexOf('f1') >= 0, true, 'f1 function name: ' + stack[1]);
        }
    });

    if (pst.mode(ex) == 'ie') {
        test("ie10 live", function() {
            function f1(arg1, arg2) {
                try {
                    return this.undef();
                } catch (exception) {
                    return exception;
                }
            }

            var f2 = function() {
                return f1(1, "abc");
            };

            var e = (function() {
                return f2();
            })();

            expect(3);
            var message = pst.ie(e);
            //equals(e.stack, '', 'original stack trace');
            //equals(message.join('\n'), '', 'processed stack trace');
            equals(message[0].indexOf('f1@'), 0, message[0] + ' should start with f1@');
            equals(message[1].indexOf('f2@'), 0, message[1] + ' should start with f2@');
            equals(message[2].indexOf('{anonymous}()@'), 0, message[2] + ' should start with {anonymous}()@');
        });
    }

    test("ie10", function() {
        expect(4);

        var message = pst.ie(CapturedExceptions.ie_10);
        equals(message.length, 3, '3 stack entries');
        equals(message[0], '{anonymous}()@http://jenkins.eriwen.com/job/stacktrace.js/ws/test/functional/ExceptionLab.html:48:13');
        equals(message[1], 'dumpException3@http://jenkins.eriwen.com/job/stacktrace.js/ws/test/functional/ExceptionLab.html:46:9');
        equals(message[2], 'onclick@http://jenkins.eriwen.com/job/stacktrace.js/ws/test/functional/ExceptionLab.html:82:1');
    });

    test("other", function() {
        var mode = pst.mode(UnitTest.fn.createGenericError());
        var frame = function(args, fun, caller) {
            this['arguments'] = args;
            this.caller = caller;
            this.fun = fun;
        };
        frame.prototype.toString = function() {
            return 'function ' + this.fun + '() {}';
        };
        function f10() {
        }

        var frame_f2 = new frame([], '', undefined);
        var frame_f1 = new frame([1, 'abc', f10, {
            1: {
                2: {
                    3: 4
                }
            }
        }], 'FUNCTION f1  (a,b,c)', frame_f2);

        expect(mode == 'other' ? 4 : 2);
        var message = pst.other(frame_f1);
        equals(message[0].indexOf('f1(1,"abc",#function,#object)') >= 0, true, 'f1');
        equals(message[1].indexOf('{anonymous}()') >= 0, true, 'f2 anonymous');

        if (mode == 'other') {
            function f1(arg1, arg2) {
                var message = pst.other(arguments.callee);
                //equals(message.join("\n"), '', 'debug');
                equals(message[0].indexOf('f1(1,"abc",#function,#object)') >= 0, true, 'f1');
                equals(message[1].indexOf('{anonymous}()') >= 0, true, 'f2 anonymous');
            }

            var f2 = function() {
                f1(1, 'abc', f10, {
                    1: {
                        2: {
                            3: 4
                        }
                    }
                });
            };
            f2();
        }
    });

    test("other in strict mode", function() {
        var results = [];
        var p = impl();

        function f1() {
            try {
                this.undef();
            } catch (e) {
                debugger;
                results = p.run(e, 'other');
            }
        }

        function f2() {
            f1();
        }

        function f3() {
            "use strict";
            f2();
        }

        f3();

        ok(results.length >= 3, 'Stack should contain at least 3 frames in non-strict mode');
        //equals(results, '', 'debug');
        equals(results[1], 'f1()');
        equals(results[2], 'f2()');
    });

    //endregion

    //region util
    module("util");

    test("stringify", function() {
        expect(5);
        equals(pst.stringifyArguments(["a", 1, {}, function() {
        }, undefined]), '"a",1,#object,#function,undefined');
        equals(pst.stringifyArguments([0, 1, 2, 3]), '0,1,2,3');
        equals(pst.stringifyArguments([
            ['a', null]
        ]), '["a",null]');
        equals(pst.stringifyArguments([
            [2, 4, 6, 8, 10, 12, 14]
        ]), '[2...14]');
        equals(pst.stringifyArguments([]), '');
    });

    test("isSameDomain", function() {
        expect(1);
        ok(pst.isSameDomain(location.href));
    });

    test("findFunctionName", function() {
        expect(13);
        equals(pst.findFunctionName(['var a = function aa() {', 'var b = 2;', '};'], 2), 'a');
        equals(pst.findFunctionName(['var a = function () {', 'var b = 2;', '};'], 2), 'a');
        equals(pst.findFunctionName(['var a = function() {', 'var b = 2;', '};'], 2), 'a');
        // FIXME: currently failing because we don't have a way to distinguish which fn is being sought
        // equals(pst.findFunctionName(['a:function(){},b:function(){', '};'], 1), 'b');
        equals(pst.findFunctionName(['"a": function(){', '};'], 1), 'a');

        // different formatting
        equals(pst.findFunctionName(['function a() {', 'var b = 2;', '}'], 2), 'a');
        equals(pst.findFunctionName(['function a(b,c) {', 'var b = 2;', '}'], 2), 'a');
        equals(pst.findFunctionName(['function  a () {', '}'], 2), 'a');
        equals(pst.findFunctionName(['function\ta\t()\t{', '}'], 2), 'a');
        equals(pst.findFunctionName(['  function', '    a', '    ()', '    {', '    }'], 3), 'a');

        equals(pst.findFunctionName(['var data = new Function("return true;");', ''], 1), 'data');
        equals(pst.findFunctionName(['var data = new Function("s,r",', '"return s + r;");'], 1), 'data');

        // not found
        equals(pst.findFunctionName(['var a = 1;', 'var b = 2;', 'var c = 3;'], 2), '(?)');

        // false positive in comment
        equals(pst.findFunctionName(['function a() {', '  // function commented()', '  error here', '}'], 3), 'a');
    });

    test("getSource cache miss", function() {
        expect(3);
        var p = impl(), file = 'file:///test', lines;
        p.ajax = function(fileArg, callback) {
            equals(fileArg, file, 'cache miss');
            return 'line0\nline1\n';
        };
        lines = p.getSource(file);
        equals(lines[0], 'line0');
        equals(lines[1], 'line1');
    });

    test("getSource cache hit", function() {
        expect(2);
        var p = impl(), file = 'file:///test', lines;
        p.ajax = function(fileArg, callback) {
            ok(false, 'not called');
        };
        p.sourceCache[file] = ['line0', 'line1'];
        lines = p.getSource(file);
        equals(lines[0], 'line0');
        equals(lines[1], 'line1');
    });

    if (window && window.location && window.location.hostname && window.location.hostname !== 'localhost') {
        test("sync ajax", function() {
            expect(1);
            var p = impl();
            var data = p.ajax(document.location.href);
            ok(data.indexOf('stacktrace') >= 0, 'synchronous get');
        });
    }

    test("guessAnonymousFunction", function() {
        expect(1);
        var p = impl();
        var file = 'http://' + window.location.hostname + '/file.js';
        p.sourceCache[file] = ['var a = function() {', 'var b = 2;', '};'];
        equals(p.guessAnonymousFunction(file, 2), 'a');
    });

    test("guessAnonymousFunction exception", function() {
        // FIXME: this test seems to affect guessAnonymousFunction opera11
        expect(1);
        var p = impl();
        var oldGetSource = p.getSource;
        p.getSource = function() {
            throw 'permission denied';
        };
        var file = 'file:///test';
        equals(p.guessAnonymousFunction(file, 2), 'getSource failed with url: file:///test, exception: permission denied');
        // Reset mocked function
        p.getSource = oldGetSource;
    });

    test("guessAnonymousFunctions firefox", function() {
        var results = [];
        var p = impl();
        var file = 'http://' + window.location.hostname + '/file.js';
        p.sourceCache[file] = ['var f2 = function () {', 'var b = 2;', '};', 'function run() {', 'return true;', '}'];
        results.push(['{anonymous}()@' + file + ':74', '{anonymous}()@' + file + ':5', '{anonymous}()@' + file + ':2']);

        (function f2() {
            try {
                this.undef();
            } catch (e) {
                if (p.mode(e) == 'firefox') {
                    results.push(p.run());
                }
            }
        })();

        expect(results.length);
        for (var i = 0; i < results.length; ++i) {
            //equals(results[i], '', 'stack trace');
            var functions = p.guessAnonymousFunctions(results[i]);
            //equals(functions.join("\n"), '', 'stack trace after guessing');
            equals(functions[2].substring(0, 2), 'f2', 'guessed f2 as 3rd result: ' + functions[2]);
            //equals(functions[2].indexOf('f2'), 0, 'guessed f2 as 3rd result');
        }
    });

    test("guessAnonymousFunctions chrome", function() {
        var results = [];
        var p = impl();
        var file = 'http://' + window.location.hostname + '/file.js';
        p.sourceCache[file] = ['var f2 = function() {', 'var b = 2;', '};'];
        results.push(['createException() (' + file + ':1:1)', 'run() (' + file + ':1:1)', 'f2() (' + file + ':1:1)']);

        var f2 = function() {
            try {
                this.undef();
            } catch (e) {
                if (p.mode(e) == 'chrome') {
                    results.push(p.run());
                }
            }
        };
        f2();

        expect(results.length);
        for (var i = 0; i < results.length; ++i) {
            //equals((results[i]), '', 'debug');
            var functions = p.guessAnonymousFunctions(results[i]);
            // equals(functions.join("\n"), '', 'debug contents of stack');
            equals(functions[2].indexOf('f2'), 0, 'guessed f2 in ' + functions[2]);
        }
    });

    // Test for issue #34
    test("guessAnonymousFunctions chrome with eval", function() {
        var unit = impl();
        var expected = '{anonymous}()@eval at buildTmplFn (http://domain.com/file.js:17:10)';
        var actual = unit.guessAnonymousFunctions([expected]);
        expect(1);
        // Nothing should change since no anonymous function in stack
        equals(expected, actual);
    });

    test("guessAnonymousFunctions opera9", function() {
        var results = [];
        var p = impl();
        var file = 'http://' + window.location.hostname + '/file.js';
        p.sourceCache[file] = ['var f2 = function() {', 'bar();', '};'];
        results.push(['{anonymous}()@' + file + ':2 -- bar();']);

        var f2 = function() {
            try {
                this.undef();
            } catch (e) {
                if (p.mode(e) == 'opera9') {
                    results.push(p.run(e));
                }
            }
        };
        f2();

        expect(results.length * 1);
        for (var i = 0; i < results.length; ++i) {
            //equals((results[i]), '', 'debug');
            var functions = p.guessAnonymousFunctions(results[i]);
            //equals(functions, '', 'debug');
            equals(functions[0].indexOf('f2()'), 0, 'guessed f2 in ' + functions[0]);
        }
    });

    test("guessAnonymousFunctions opera10", function() {
        // FIXME: currently failing in Opera 10.60
        var results = [];
        var p = impl();
        var file = 'http://' + window.location.hostname + '/file.js';
        p.sourceCache[file] = ['var f2 = function() {', 'var b = 2;', '};'];
        results.push(["{anonymous}()@" + file + ":1:1", "{anonymous}()@" + file + ":1:1"]);

        var f2 = function() {
            try {
                this.undef();
            } catch (e) {
                if (p.mode(e) == 'opera10') {
                    //alert("e.message: " + e.message);
                    results.push(p.run());
                }
            }
        };
        f2();

        expect(results.length * 1);
        for (var i = 0; i < results.length; ++i) {
            //equals((results[i]), '', 'debug');
            var functions = p.guessAnonymousFunctions(results[i]);
            //equals(functions.join("\n"), '', 'debug');
            equals(functions[1].indexOf('f2()'), 0, 'guessed f2 in ' + functions[1]);
        }
    });

    test("guessAnonymousFunctions opera11", function() {
        var results = [];
        var p = impl();
        var file = 'http://' + window.location.hostname + '/file.js';
        p.sourceCache[file] = ['var f2 = function() {', 'bar();', '};'];
        results.push(["{anonymous}()@" + file + ":2:1 -- bar();"]);

        var f2 = function() {
            try {
                this.undef();
            } catch (e) {
                if (p.mode(e) == 'opera11') {
                    results.push(p.run(e));
                }
            }
        };
        f2();

        expect(results.length * 1);
        for (var i = 0; i < results.length; ++i) {
            //equals((results[i]), '', 'debug');
            var functions = p.guessAnonymousFunctions(results[i]);
            //equals(functions.join("\n"), '', 'debug');
            equals(functions[0].indexOf('f2()'), 0, 'guessed f2 in ' + functions[0]);
        }
    });

    test("guessAnonymousFunctions other", function() {
        var results = [];
        var p = impl();
        var file = 'http://' + window.location.hostname + '/file.js';
        p.sourceCache[file] = ['var f2 = function() {', 'var b = 2;', '};'];
        results.push(['{anonymous}()']);

        (function f2() {
            try {
                this.undef();
            } catch (e) {
                if (p.mode(e) == 'other') {
                    results.push(p.run());
                }
            }
        })();

        expect(results.length);
        for (var i = 0; i < results.length; ++i) {
            //equals((results[i]), '', 'debug');
            equals(p.guessAnonymousFunctions(results[i])[0].indexOf('{anonymous}'), 0, 'no file and line number in "other" mode');
        }
    });
    //endregion
})(window, document);
