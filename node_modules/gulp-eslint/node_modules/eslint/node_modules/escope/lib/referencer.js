"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

/*
  Copyright (C) 2015 Yusuke Suzuki <utatane.tea@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

var Syntax = require("estraverse").Syntax;

var esrecurse = _interopRequire(require("esrecurse"));

var Reference = _interopRequire(require("./reference"));

var Variable = _interopRequire(require("./variable"));

var _definition = require("./definition");

var ParameterDefinition = _definition.ParameterDefinition;
var Definition = _definition.Definition;

var assert = _interopRequire(require("assert"));

var PatternVisitor = (function (_esrecurse$Visitor) {
    function PatternVisitor(rootPattern, callback) {
        _classCallCheck(this, PatternVisitor);

        _get(Object.getPrototypeOf(PatternVisitor.prototype), "constructor", this).call(this);
        this.rootPattern = rootPattern;
        this.callback = callback;
        this.assignments = [];
        this.rightHandNodes = [];
        this.restElements = [];
    }

    _inherits(PatternVisitor, _esrecurse$Visitor);

    _createClass(PatternVisitor, {
        Identifier: {
            value: function Identifier(pattern) {
                var lastRestElement = getLast(this.restElements);
                this.callback(pattern, {
                    topLevel: pattern === this.rootPattern,
                    rest: lastRestElement != null && lastRestElement.argument === pattern,
                    assignments: this.assignments
                });
            }
        },
        ObjectPattern: {
            value: function ObjectPattern(pattern) {
                var i, iz, property;
                for (i = 0, iz = pattern.properties.length; i < iz; ++i) {
                    property = pattern.properties[i];

                    // Computed property's key is a right hand node.
                    if (property.computed) {
                        this.rightHandNodes.push(property.key);
                    }

                    // If it's shorthand, its key is same as its value.
                    // If it's shorthand and has its default value, its key is same as its value.left (the value is AssignmentPattern).
                    // If it's not shorthand, the name of new variable is its value's.
                    this.visit(property.value);
                }
            }
        },
        ArrayPattern: {
            value: function ArrayPattern(pattern) {
                var i, iz, element;
                for (i = 0, iz = pattern.elements.length; i < iz; ++i) {
                    element = pattern.elements[i];
                    this.visit(element);
                }
            }
        },
        AssignmentPattern: {
            value: function AssignmentPattern(pattern) {
                this.assignments.push(pattern);
                this.visit(pattern.left);
                this.rightHandNodes.push(pattern.right);
                this.assignments.pop();
            }
        },
        RestElement: {
            value: function RestElement(pattern) {
                this.restElements.push(pattern);
                this.visit(pattern.argument);
                this.restElements.pop();
            }
        },
        MemberExpression: {
            value: function MemberExpression(node) {
                // Computed property's key is a right hand node.
                if (node.computed) {
                    this.rightHandNodes.push(node.property);
                }
                // the object is only read, write to its property.
                this.rightHandNodes.push(node.object);
            }
        },
        SpreadElement: {

            //
            // ForInStatement.left and AssignmentExpression.left are LeftHandSideExpression.
            // By spec, LeftHandSideExpression is Pattern or MemberExpression.
            //   (see also: https://github.com/estree/estree/pull/20#issuecomment-74584758)
            // But espree 2.0 and esprima 2.0 parse to ArrayExpression, ObjectExpression, etc...
            //

            value: function SpreadElement(node) {
                this.visit(node.argument);
            }
        },
        ArrayExpression: {
            value: function ArrayExpression(node) {
                node.elements.forEach(this.visit, this);
            }
        },
        ObjectExpression: {
            value: function ObjectExpression(node) {
                var _this = this;

                node.properties.forEach(function (property) {
                    // Computed property's key is a right hand node.
                    if (property.computed) {
                        _this.rightHandNodes.push(property.key);
                    }
                    _this.visit(property.value);
                });
            }
        },
        AssignmentExpression: {
            value: function AssignmentExpression(node) {
                this.assignments.push(node);
                this.visit(node.left);
                this.rightHandNodes.push(node.right);
                this.assignments.pop();
            }
        },
        CallExpression: {
            value: function CallExpression(node) {
                var _this = this;

                // arguments are right hand nodes.
                node.arguments.forEach(function (a) {
                    _this.rightHandNodes.push(a);
                });
                this.visit(node.callee);
            }
        }
    });

    return PatternVisitor;
})(esrecurse.Visitor);

function getLast(xs) {
    return xs[xs.length - 1] || null;
}

function traverseIdentifierInPattern(rootPattern, referencer, callback) {
    // Call the callback at left hand identifier nodes, and Collect right hand nodes.
    var visitor = new PatternVisitor(rootPattern, callback);
    visitor.visit(rootPattern);

    // Process the right hand nodes recursively.
    if (referencer != null) {
        visitor.rightHandNodes.forEach(referencer.visit, referencer);
    }
}

function isPattern(node) {
    var nodeType = node.type;
    return nodeType === Syntax.Identifier || nodeType === Syntax.ObjectPattern || nodeType === Syntax.ArrayPattern || nodeType === Syntax.SpreadElement || nodeType === Syntax.RestElement || nodeType === Syntax.AssignmentPattern;
}

// Importing ImportDeclaration.
// http://people.mozilla.org/~jorendorff/es6-draft.html#sec-moduledeclarationinstantiation
// https://github.com/estree/estree/blob/master/es6.md#importdeclaration
// FIXME: Now, we don't create module environment, because the context is
// implementation dependent.

var Importer = (function (_esrecurse$Visitor2) {
    function Importer(declaration, referencer) {
        _classCallCheck(this, Importer);

        _get(Object.getPrototypeOf(Importer.prototype), "constructor", this).call(this);
        this.declaration = declaration;
        this.referencer = referencer;
    }

    _inherits(Importer, _esrecurse$Visitor2);

    _createClass(Importer, {
        visitImport: {
            value: function visitImport(id, specifier) {
                var _this = this;

                this.referencer.visitPattern(id, function (pattern) {
                    _this.referencer.currentScope().__define(pattern, new Definition(Variable.ImportBinding, pattern, specifier, _this.declaration, null, null));
                });
            }
        },
        ImportNamespaceSpecifier: {
            value: function ImportNamespaceSpecifier(node) {
                var local = node.local || node.id;
                if (local) {
                    this.visitImport(local, node);
                }
            }
        },
        ImportDefaultSpecifier: {
            value: function ImportDefaultSpecifier(node) {
                var local = node.local || node.id;
                this.visitImport(local, node);
            }
        },
        ImportSpecifier: {
            value: function ImportSpecifier(node) {
                var local = node.local || node.id;
                if (node.name) {
                    this.visitImport(node.name, node);
                } else {
                    this.visitImport(local, node);
                }
            }
        }
    });

    return Importer;
})(esrecurse.Visitor);

// Referencing variables and creating bindings.

var Referencer = (function (_esrecurse$Visitor3) {
    function Referencer(scopeManager) {
        _classCallCheck(this, Referencer);

        _get(Object.getPrototypeOf(Referencer.prototype), "constructor", this).call(this);
        this.scopeManager = scopeManager;
        this.parent = null;
        this.isInnerMethodDefinition = false;
    }

    _inherits(Referencer, _esrecurse$Visitor3);

    _createClass(Referencer, {
        currentScope: {
            value: function currentScope() {
                return this.scopeManager.__currentScope;
            }
        },
        close: {
            value: function close(node) {
                while (this.currentScope() && node === this.currentScope().block) {
                    this.scopeManager.__currentScope = this.currentScope().__close(this.scopeManager);
                }
            }
        },
        pushInnerMethodDefinition: {
            value: function pushInnerMethodDefinition(isInnerMethodDefinition) {
                var previous = this.isInnerMethodDefinition;
                this.isInnerMethodDefinition = isInnerMethodDefinition;
                return previous;
            }
        },
        popInnerMethodDefinition: {
            value: function popInnerMethodDefinition(isInnerMethodDefinition) {
                this.isInnerMethodDefinition = isInnerMethodDefinition;
            }
        },
        materializeTDZScope: {
            value: function materializeTDZScope(node, iterationNode) {
                // http://people.mozilla.org/~jorendorff/es6-draft.html#sec-runtime-semantics-forin-div-ofexpressionevaluation-abstract-operation
                // TDZ scope hides the declaration's names.
                this.scopeManager.__nestTDZScope(node, iterationNode);
                this.visitVariableDeclaration(this.currentScope(), Variable.TDZ, iterationNode.left, 0, true);
            }
        },
        materializeIterationScope: {
            value: function materializeIterationScope(node) {
                var _this = this;

                // Generate iteration scope for upper ForIn/ForOf Statements.
                var letOrConstDecl;
                this.scopeManager.__nestForScope(node);
                letOrConstDecl = node.left;
                this.visitVariableDeclaration(this.currentScope(), Variable.Variable, letOrConstDecl, 0);
                this.visitPattern(letOrConstDecl.declarations[0].id, function (pattern) {
                    _this.currentScope().__referencing(pattern, Reference.WRITE, node.right, null, true, true);
                });
            }
        },
        referencingDefaultValue: {
            value: function referencingDefaultValue(pattern, assignments, maybeImplicitGlobal, init) {
                var scope = this.currentScope();
                assignments.forEach(function (assignment) {
                    scope.__referencing(pattern, Reference.WRITE, assignment.right, maybeImplicitGlobal, pattern !== assignment.left, init);
                });
            }
        },
        visitPattern: {
            value: function visitPattern(node, options, callback) {
                if (typeof options === "function") {
                    callback = options;
                    options = { processRightHandNodes: false };
                }
                traverseIdentifierInPattern(node, options.processRightHandNodes ? this : null, callback);
            }
        },
        visitFunction: {
            value: function visitFunction(node) {
                var _this = this;

                var i, iz;
                // FunctionDeclaration name is defined in upper scope
                // NOTE: Not referring variableScope. It is intended.
                // Since
                //  in ES5, FunctionDeclaration should be in FunctionBody.
                //  in ES6, FunctionDeclaration should be block scoped.
                if (node.type === Syntax.FunctionDeclaration) {
                    // id is defined in upper scope
                    this.currentScope().__define(node.id, new Definition(Variable.FunctionName, node.id, node, null, null, null));
                }

                // FunctionExpression with name creates its special scope;
                // FunctionExpressionNameScope.
                if (node.type === Syntax.FunctionExpression && node.id) {
                    this.scopeManager.__nestFunctionExpressionNameScope(node);
                }

                // Consider this function is in the MethodDefinition.
                this.scopeManager.__nestFunctionScope(node, this.isInnerMethodDefinition);

                // Process parameter declarations.
                for (i = 0, iz = node.params.length; i < iz; ++i) {
                    this.visitPattern(node.params[i], { processRightHandNodes: true }, function (pattern, info) {
                        _this.currentScope().__define(pattern, new ParameterDefinition(pattern, node, i, info.rest));

                        _this.referencingDefaultValue(pattern, info.assignments, null, true);
                    });
                }

                // if there's a rest argument, add that
                if (node.rest) {
                    this.visitPattern({
                        type: "RestElement",
                        argument: node.rest
                    }, function (pattern) {
                        _this.currentScope().__define(pattern, new ParameterDefinition(pattern, node, node.params.length, true));
                    });
                }

                // Skip BlockStatement to prevent creating BlockStatement scope.
                if (node.body.type === Syntax.BlockStatement) {
                    this.visitChildren(node.body);
                } else {
                    this.visit(node.body);
                }

                this.close(node);
            }
        },
        visitClass: {
            value: function visitClass(node) {
                if (node.type === Syntax.ClassDeclaration) {
                    this.currentScope().__define(node.id, new Definition(Variable.ClassName, node.id, node, null, null, null));
                }

                // FIXME: Maybe consider TDZ.
                this.visit(node.superClass);

                this.scopeManager.__nestClassScope(node);

                if (node.id) {
                    this.currentScope().__define(node.id, new Definition(Variable.ClassName, node.id, node));
                }
                this.visit(node.body);

                this.close(node);
            }
        },
        visitProperty: {
            value: function visitProperty(node) {
                var previous, isMethodDefinition;
                if (node.computed) {
                    this.visit(node.key);
                }

                isMethodDefinition = node.type === Syntax.MethodDefinition;
                if (isMethodDefinition) {
                    previous = this.pushInnerMethodDefinition(true);
                }
                this.visit(node.value);
                if (isMethodDefinition) {
                    this.popInnerMethodDefinition(previous);
                }
            }
        },
        visitForIn: {
            value: function visitForIn(node) {
                var _this = this;

                if (node.left.type === Syntax.VariableDeclaration && node.left.kind !== "var") {
                    this.materializeTDZScope(node.right, node);
                    this.visit(node.right);
                    this.close(node.right);

                    this.materializeIterationScope(node);
                    this.visit(node.body);
                    this.close(node);
                } else {
                    if (node.left.type === Syntax.VariableDeclaration) {
                        this.visit(node.left);
                        this.visitPattern(node.left.declarations[0].id, function (pattern) {
                            _this.currentScope().__referencing(pattern, Reference.WRITE, node.right, null, true, true);
                        });
                    } else {
                        this.visitPattern(node.left, { processRightHandNodes: true }, function (pattern, info) {
                            var maybeImplicitGlobal = null;
                            if (!_this.currentScope().isStrict) {
                                maybeImplicitGlobal = {
                                    pattern: pattern,
                                    node: node
                                };
                            }
                            _this.referencingDefaultValue(pattern, info.assignments, maybeImplicitGlobal, false);
                            _this.currentScope().__referencing(pattern, Reference.WRITE, node.right, maybeImplicitGlobal, true, false);
                        });
                    }
                    this.visit(node.right);
                    this.visit(node.body);
                }
            }
        },
        visitVariableDeclaration: {
            value: function visitVariableDeclaration(variableTargetScope, type, node, index, fromTDZ) {
                var _this = this;

                // If this was called to initialize a TDZ scope, this needs to make definitions, but doesn't make references.
                var decl, init;

                decl = node.declarations[index];
                init = decl.init;
                this.visitPattern(decl.id, { processRightHandNodes: !fromTDZ }, function (pattern, info) {
                    variableTargetScope.__define(pattern, new Definition(type, pattern, decl, node, index, node.kind));

                    if (!fromTDZ) {
                        _this.referencingDefaultValue(pattern, info.assignments, null, true);
                    }
                    if (init) {
                        _this.currentScope().__referencing(pattern, Reference.WRITE, init, null, !info.topLevel, true);
                    }
                });
            }
        },
        AssignmentExpression: {
            value: function AssignmentExpression(node) {
                var _this = this;

                if (isPattern(node.left)) {
                    if (node.operator === "=") {
                        this.visitPattern(node.left, { processRightHandNodes: true }, function (pattern, info) {
                            var maybeImplicitGlobal = null;
                            if (!_this.currentScope().isStrict) {
                                maybeImplicitGlobal = {
                                    pattern: pattern,
                                    node: node
                                };
                            }
                            _this.referencingDefaultValue(pattern, info.assignments, maybeImplicitGlobal, false);
                            _this.currentScope().__referencing(pattern, Reference.WRITE, node.right, maybeImplicitGlobal, !info.topLevel, false);
                        });
                    } else {
                        this.currentScope().__referencing(node.left, Reference.RW, node.right);
                    }
                } else {
                    this.visit(node.left);
                }
                this.visit(node.right);
            }
        },
        CatchClause: {
            value: function CatchClause(node) {
                var _this = this;

                this.scopeManager.__nestCatchScope(node);

                this.visitPattern(node.param, { processRightHandNodes: true }, function (pattern, info) {
                    _this.currentScope().__define(pattern, new Definition(Variable.CatchClause, node.param, node, null, null, null));
                    _this.referencingDefaultValue(pattern, info.assignments, null, true);
                });
                this.visit(node.body);

                this.close(node);
            }
        },
        Program: {
            value: function Program(node) {
                this.scopeManager.__nestGlobalScope(node);

                if (this.scopeManager.__isNodejsScope()) {
                    // Force strictness of GlobalScope to false when using node.js scope.
                    this.currentScope().isStrict = false;
                    this.scopeManager.__nestFunctionScope(node, false);
                }

                if (this.scopeManager.__isES6() && this.scopeManager.isModule()) {
                    this.scopeManager.__nestModuleScope(node);
                }

                this.visitChildren(node);
                this.close(node);
            }
        },
        Identifier: {
            value: function Identifier(node) {
                this.currentScope().__referencing(node);
            }
        },
        UpdateExpression: {
            value: function UpdateExpression(node) {
                if (isPattern(node.argument)) {
                    this.currentScope().__referencing(node.argument, Reference.RW, null);
                } else {
                    this.visitChildren(node);
                }
            }
        },
        MemberExpression: {
            value: function MemberExpression(node) {
                this.visit(node.object);
                if (node.computed) {
                    this.visit(node.property);
                }
            }
        },
        Property: {
            value: function Property(node) {
                this.visitProperty(node);
            }
        },
        MethodDefinition: {
            value: function MethodDefinition(node) {
                this.visitProperty(node);
            }
        },
        BreakStatement: {
            value: function BreakStatement() {}
        },
        ContinueStatement: {
            value: function ContinueStatement() {}
        },
        LabeledStatement: {
            value: function LabeledStatement(node) {
                this.visit(node.body);
            }
        },
        ForStatement: {
            value: function ForStatement(node) {
                // Create ForStatement declaration.
                // NOTE: In ES6, ForStatement dynamically generates
                // per iteration environment. However, escope is
                // a static analyzer, we only generate one scope for ForStatement.
                if (node.init && node.init.type === Syntax.VariableDeclaration && node.init.kind !== "var") {
                    this.scopeManager.__nestForScope(node);
                }

                this.visitChildren(node);

                this.close(node);
            }
        },
        ClassExpression: {
            value: function ClassExpression(node) {
                this.visitClass(node);
            }
        },
        ClassDeclaration: {
            value: function ClassDeclaration(node) {
                this.visitClass(node);
            }
        },
        CallExpression: {
            value: function CallExpression(node) {
                // Check this is direct call to eval
                if (!this.scopeManager.__ignoreEval() && node.callee.type === Syntax.Identifier && node.callee.name === "eval") {
                    // NOTE: This should be `variableScope`. Since direct eval call always creates Lexical environment and
                    // let / const should be enclosed into it. Only VariableDeclaration affects on the caller's environment.
                    this.currentScope().variableScope.__detectEval();
                }
                this.visitChildren(node);
            }
        },
        BlockStatement: {
            value: function BlockStatement(node) {
                if (this.scopeManager.__isES6()) {
                    this.scopeManager.__nestBlockScope(node);
                }

                this.visitChildren(node);

                this.close(node);
            }
        },
        ThisExpression: {
            value: function ThisExpression() {
                this.currentScope().variableScope.__detectThis();
            }
        },
        WithStatement: {
            value: function WithStatement(node) {
                this.visit(node.object);
                // Then nest scope for WithStatement.
                this.scopeManager.__nestWithScope(node);

                this.visit(node.body);

                this.close(node);
            }
        },
        VariableDeclaration: {
            value: function VariableDeclaration(node) {
                var variableTargetScope, i, iz, decl;
                variableTargetScope = node.kind === "var" ? this.currentScope().variableScope : this.currentScope();
                for (i = 0, iz = node.declarations.length; i < iz; ++i) {
                    decl = node.declarations[i];
                    this.visitVariableDeclaration(variableTargetScope, Variable.Variable, node, i);
                    if (decl.init) {
                        this.visit(decl.init);
                    }
                }
            }
        },
        SwitchStatement: {

            // sec 13.11.8

            value: function SwitchStatement(node) {
                var i, iz;

                this.visit(node.discriminant);

                if (this.scopeManager.__isES6()) {
                    this.scopeManager.__nestSwitchScope(node);
                }

                for (i = 0, iz = node.cases.length; i < iz; ++i) {
                    this.visit(node.cases[i]);
                }

                this.close(node);
            }
        },
        FunctionDeclaration: {
            value: function FunctionDeclaration(node) {
                this.visitFunction(node);
            }
        },
        FunctionExpression: {
            value: function FunctionExpression(node) {
                this.visitFunction(node);
            }
        },
        ForOfStatement: {
            value: function ForOfStatement(node) {
                this.visitForIn(node);
            }
        },
        ForInStatement: {
            value: function ForInStatement(node) {
                this.visitForIn(node);
            }
        },
        ArrowFunctionExpression: {
            value: function ArrowFunctionExpression(node) {
                this.visitFunction(node);
            }
        },
        ImportDeclaration: {
            value: function ImportDeclaration(node) {
                var importer;

                assert(this.scopeManager.__isES6() && this.scopeManager.isModule(), "ImportDeclaration should appear when the mode is ES6 and in the module context.");

                importer = new Importer(node, this);
                importer.visit(node);
            }
        },
        visitExportDeclaration: {
            value: function visitExportDeclaration(node) {
                if (node.source) {
                    return;
                }
                if (node.declaration) {
                    this.visit(node.declaration);
                    return;
                }

                this.visitChildren(node);
            }
        },
        ExportDeclaration: {
            value: function ExportDeclaration(node) {
                this.visitExportDeclaration(node);
            }
        },
        ExportNamedDeclaration: {
            value: function ExportNamedDeclaration(node) {
                this.visitExportDeclaration(node);
            }
        },
        ExportSpecifier: {
            value: function ExportSpecifier(node) {
                var local = node.id || node.local;
                this.visit(local);
            }
        }
    });

    return Referencer;
})(esrecurse.Visitor);

module.exports = Referencer;

/* vim: set sw=4 ts=4 et tw=80 : */
//# sourceMappingURL=data:application/json;base64,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QUFLLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDckI7Ozs7V0E5ZGdCLFVBQVU7R0FBUyxTQUFTLENBQUMsT0FBTzs7aUJBQXBDLFVBQVUiLCJmaWxlIjoicmVmZXJlbmNlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gIENvcHlyaWdodCAoQykgMjAxNSBZdXN1a2UgU3V6dWtpIDx1dGF0YW5lLnRlYUBnbWFpbC5jb20+XG5cbiAgUmVkaXN0cmlidXRpb24gYW5kIHVzZSBpbiBzb3VyY2UgYW5kIGJpbmFyeSBmb3Jtcywgd2l0aCBvciB3aXRob3V0XG4gIG1vZGlmaWNhdGlvbiwgYXJlIHBlcm1pdHRlZCBwcm92aWRlZCB0aGF0IHRoZSBmb2xsb3dpbmcgY29uZGl0aW9ucyBhcmUgbWV0OlxuXG4gICAgKiBSZWRpc3RyaWJ1dGlvbnMgb2Ygc291cmNlIGNvZGUgbXVzdCByZXRhaW4gdGhlIGFib3ZlIGNvcHlyaWdodFxuICAgICAgbm90aWNlLCB0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlIGZvbGxvd2luZyBkaXNjbGFpbWVyLlxuICAgICogUmVkaXN0cmlidXRpb25zIGluIGJpbmFyeSBmb3JtIG11c3QgcmVwcm9kdWNlIHRoZSBhYm92ZSBjb3B5cmlnaHRcbiAgICAgIG5vdGljZSwgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lciBpbiB0aGVcbiAgICAgIGRvY3VtZW50YXRpb24gYW5kL29yIG90aGVyIG1hdGVyaWFscyBwcm92aWRlZCB3aXRoIHRoZSBkaXN0cmlidXRpb24uXG5cbiAgVEhJUyBTT0ZUV0FSRSBJUyBQUk9WSURFRCBCWSBUSEUgQ09QWVJJR0hUIEhPTERFUlMgQU5EIENPTlRSSUJVVE9SUyBcIkFTIElTXCJcbiAgQU5EIEFOWSBFWFBSRVNTIE9SIElNUExJRUQgV0FSUkFOVElFUywgSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFRIRVxuICBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZIEFORCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRVxuICBBUkUgRElTQ0xBSU1FRC4gSU4gTk8gRVZFTlQgU0hBTEwgPENPUFlSSUdIVCBIT0xERVI+IEJFIExJQUJMRSBGT1IgQU5ZXG4gIERJUkVDVCwgSU5ESVJFQ1QsIElOQ0lERU5UQUwsIFNQRUNJQUwsIEVYRU1QTEFSWSwgT1IgQ09OU0VRVUVOVElBTCBEQU1BR0VTXG4gIChJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgUFJPQ1VSRU1FTlQgT0YgU1VCU1RJVFVURSBHT09EUyBPUiBTRVJWSUNFUztcbiAgTE9TUyBPRiBVU0UsIERBVEEsIE9SIFBST0ZJVFM7IE9SIEJVU0lORVNTIElOVEVSUlVQVElPTikgSE9XRVZFUiBDQVVTRUQgQU5EXG4gIE9OIEFOWSBUSEVPUlkgT0YgTElBQklMSVRZLCBXSEVUSEVSIElOIENPTlRSQUNULCBTVFJJQ1QgTElBQklMSVRZLCBPUiBUT1JUXG4gIChJTkNMVURJTkcgTkVHTElHRU5DRSBPUiBPVEhFUldJU0UpIEFSSVNJTkcgSU4gQU5ZIFdBWSBPVVQgT0YgVEhFIFVTRSBPRlxuICBUSElTIFNPRlRXQVJFLCBFVkVOIElGIEFEVklTRUQgT0YgVEhFIFBPU1NJQklMSVRZIE9GIFNVQ0ggREFNQUdFLlxuKi9cbmltcG9ydCB7IFN5bnRheCB9IGZyb20gJ2VzdHJhdmVyc2UnO1xuaW1wb3J0IGVzcmVjdXJzZSBmcm9tICdlc3JlY3Vyc2UnO1xuaW1wb3J0IFJlZmVyZW5jZSBmcm9tICcuL3JlZmVyZW5jZSc7XG5pbXBvcnQgVmFyaWFibGUgZnJvbSAnLi92YXJpYWJsZSc7XG5pbXBvcnQgeyBQYXJhbWV0ZXJEZWZpbml0aW9uLCBEZWZpbml0aW9uIH0gZnJvbSAnLi9kZWZpbml0aW9uJztcbmltcG9ydCBhc3NlcnQgZnJvbSAnYXNzZXJ0JztcblxuY2xhc3MgUGF0dGVyblZpc2l0b3IgZXh0ZW5kcyBlc3JlY3Vyc2UuVmlzaXRvciB7XG4gICAgY29uc3RydWN0b3Iocm9vdFBhdHRlcm4sIGNhbGxiYWNrKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMucm9vdFBhdHRlcm4gPSByb290UGF0dGVybjtcbiAgICAgICAgdGhpcy5jYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICB0aGlzLmFzc2lnbm1lbnRzID0gW107XG4gICAgICAgIHRoaXMucmlnaHRIYW5kTm9kZXMgPSBbXTtcbiAgICAgICAgdGhpcy5yZXN0RWxlbWVudHMgPSBbXTtcbiAgICB9XG5cbiAgICBJZGVudGlmaWVyKHBhdHRlcm4pIHtcbiAgICAgICAgY29uc3QgbGFzdFJlc3RFbGVtZW50ID0gZ2V0TGFzdCh0aGlzLnJlc3RFbGVtZW50cyk7XG4gICAgICAgIHRoaXMuY2FsbGJhY2socGF0dGVybiwge1xuICAgICAgICAgICAgdG9wTGV2ZWw6IHBhdHRlcm4gPT09IHRoaXMucm9vdFBhdHRlcm4sXG4gICAgICAgICAgICByZXN0OiBsYXN0UmVzdEVsZW1lbnQgIT0gbnVsbCAmJiBsYXN0UmVzdEVsZW1lbnQuYXJndW1lbnQgPT09IHBhdHRlcm4sXG4gICAgICAgICAgICBhc3NpZ25tZW50czogdGhpcy5hc3NpZ25tZW50c1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBPYmplY3RQYXR0ZXJuKHBhdHRlcm4pIHtcbiAgICAgICAgdmFyIGksIGl6LCBwcm9wZXJ0eTtcbiAgICAgICAgZm9yIChpID0gMCwgaXogPSBwYXR0ZXJuLnByb3BlcnRpZXMubGVuZ3RoOyBpIDwgaXo7ICsraSkge1xuICAgICAgICAgICAgcHJvcGVydHkgPSBwYXR0ZXJuLnByb3BlcnRpZXNbaV07XG5cbiAgICAgICAgICAgIC8vIENvbXB1dGVkIHByb3BlcnR5J3Mga2V5IGlzIGEgcmlnaHQgaGFuZCBub2RlLlxuICAgICAgICAgICAgaWYgKHByb3BlcnR5LmNvbXB1dGVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yaWdodEhhbmROb2Rlcy5wdXNoKHByb3BlcnR5LmtleSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElmIGl0J3Mgc2hvcnRoYW5kLCBpdHMga2V5IGlzIHNhbWUgYXMgaXRzIHZhbHVlLlxuICAgICAgICAgICAgLy8gSWYgaXQncyBzaG9ydGhhbmQgYW5kIGhhcyBpdHMgZGVmYXVsdCB2YWx1ZSwgaXRzIGtleSBpcyBzYW1lIGFzIGl0cyB2YWx1ZS5sZWZ0ICh0aGUgdmFsdWUgaXMgQXNzaWdubWVudFBhdHRlcm4pLlxuICAgICAgICAgICAgLy8gSWYgaXQncyBub3Qgc2hvcnRoYW5kLCB0aGUgbmFtZSBvZiBuZXcgdmFyaWFibGUgaXMgaXRzIHZhbHVlJ3MuXG4gICAgICAgICAgICB0aGlzLnZpc2l0KHByb3BlcnR5LnZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIEFycmF5UGF0dGVybihwYXR0ZXJuKSB7XG4gICAgICAgIHZhciBpLCBpeiwgZWxlbWVudDtcbiAgICAgICAgZm9yIChpID0gMCwgaXogPSBwYXR0ZXJuLmVsZW1lbnRzLmxlbmd0aDsgaSA8IGl6OyArK2kpIHtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBwYXR0ZXJuLmVsZW1lbnRzW2ldO1xuICAgICAgICAgICAgdGhpcy52aXNpdChlbGVtZW50KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIEFzc2lnbm1lbnRQYXR0ZXJuKHBhdHRlcm4pIHtcbiAgICAgICAgdGhpcy5hc3NpZ25tZW50cy5wdXNoKHBhdHRlcm4pO1xuICAgICAgICB0aGlzLnZpc2l0KHBhdHRlcm4ubGVmdCk7XG4gICAgICAgIHRoaXMucmlnaHRIYW5kTm9kZXMucHVzaChwYXR0ZXJuLnJpZ2h0KTtcbiAgICAgICAgdGhpcy5hc3NpZ25tZW50cy5wb3AoKTtcbiAgICB9XG5cbiAgICBSZXN0RWxlbWVudChwYXR0ZXJuKSB7XG4gICAgICAgIHRoaXMucmVzdEVsZW1lbnRzLnB1c2gocGF0dGVybik7XG4gICAgICAgIHRoaXMudmlzaXQocGF0dGVybi5hcmd1bWVudCk7XG4gICAgICAgIHRoaXMucmVzdEVsZW1lbnRzLnBvcCgpO1xuICAgIH1cblxuICAgIE1lbWJlckV4cHJlc3Npb24obm9kZSkge1xuICAgICAgICAvLyBDb21wdXRlZCBwcm9wZXJ0eSdzIGtleSBpcyBhIHJpZ2h0IGhhbmQgbm9kZS5cbiAgICAgICAgaWYgKG5vZGUuY29tcHV0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMucmlnaHRIYW5kTm9kZXMucHVzaChub2RlLnByb3BlcnR5KTtcbiAgICAgICAgfVxuICAgICAgICAvLyB0aGUgb2JqZWN0IGlzIG9ubHkgcmVhZCwgd3JpdGUgdG8gaXRzIHByb3BlcnR5LlxuICAgICAgICB0aGlzLnJpZ2h0SGFuZE5vZGVzLnB1c2gobm9kZS5vYmplY3QpO1xuICAgIH1cblxuICAgIC8vXG4gICAgLy8gRm9ySW5TdGF0ZW1lbnQubGVmdCBhbmQgQXNzaWdubWVudEV4cHJlc3Npb24ubGVmdCBhcmUgTGVmdEhhbmRTaWRlRXhwcmVzc2lvbi5cbiAgICAvLyBCeSBzcGVjLCBMZWZ0SGFuZFNpZGVFeHByZXNzaW9uIGlzIFBhdHRlcm4gb3IgTWVtYmVyRXhwcmVzc2lvbi5cbiAgICAvLyAgIChzZWUgYWxzbzogaHR0cHM6Ly9naXRodWIuY29tL2VzdHJlZS9lc3RyZWUvcHVsbC8yMCNpc3N1ZWNvbW1lbnQtNzQ1ODQ3NTgpXG4gICAgLy8gQnV0IGVzcHJlZSAyLjAgYW5kIGVzcHJpbWEgMi4wIHBhcnNlIHRvIEFycmF5RXhwcmVzc2lvbiwgT2JqZWN0RXhwcmVzc2lvbiwgZXRjLi4uXG4gICAgLy9cblxuICAgIFNwcmVhZEVsZW1lbnQobm9kZSkge1xuICAgICAgICB0aGlzLnZpc2l0KG5vZGUuYXJndW1lbnQpO1xuICAgIH1cblxuICAgIEFycmF5RXhwcmVzc2lvbihub2RlKSB7XG4gICAgICAgIG5vZGUuZWxlbWVudHMuZm9yRWFjaCh0aGlzLnZpc2l0LCB0aGlzKTtcbiAgICB9XG5cbiAgICBPYmplY3RFeHByZXNzaW9uKG5vZGUpIHtcbiAgICAgICAgbm9kZS5wcm9wZXJ0aWVzLmZvckVhY2gocHJvcGVydHkgPT4ge1xuICAgICAgICAgICAgLy8gQ29tcHV0ZWQgcHJvcGVydHkncyBrZXkgaXMgYSByaWdodCBoYW5kIG5vZGUuXG4gICAgICAgICAgICBpZiAocHJvcGVydHkuY29tcHV0ZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJpZ2h0SGFuZE5vZGVzLnB1c2gocHJvcGVydHkua2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMudmlzaXQocHJvcGVydHkudmFsdWUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBBc3NpZ25tZW50RXhwcmVzc2lvbihub2RlKSB7XG4gICAgICAgIHRoaXMuYXNzaWdubWVudHMucHVzaChub2RlKTtcbiAgICAgICAgdGhpcy52aXNpdChub2RlLmxlZnQpO1xuICAgICAgICB0aGlzLnJpZ2h0SGFuZE5vZGVzLnB1c2gobm9kZS5yaWdodCk7XG4gICAgICAgIHRoaXMuYXNzaWdubWVudHMucG9wKCk7XG4gICAgfVxuXG4gICAgQ2FsbEV4cHJlc3Npb24obm9kZSkge1xuICAgICAgICAvLyBhcmd1bWVudHMgYXJlIHJpZ2h0IGhhbmQgbm9kZXMuXG4gICAgICAgIG5vZGUuYXJndW1lbnRzLmZvckVhY2goYSA9PiB7IHRoaXMucmlnaHRIYW5kTm9kZXMucHVzaChhKTsgfSk7XG4gICAgICAgIHRoaXMudmlzaXQobm9kZS5jYWxsZWUpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0TGFzdCh4cykge1xuICAgIHJldHVybiB4c1t4cy5sZW5ndGggLSAxXSB8fCBudWxsO1xufVxuXG5mdW5jdGlvbiB0cmF2ZXJzZUlkZW50aWZpZXJJblBhdHRlcm4ocm9vdFBhdHRlcm4sIHJlZmVyZW5jZXIsIGNhbGxiYWNrKSB7XG4gICAgLy8gQ2FsbCB0aGUgY2FsbGJhY2sgYXQgbGVmdCBoYW5kIGlkZW50aWZpZXIgbm9kZXMsIGFuZCBDb2xsZWN0IHJpZ2h0IGhhbmQgbm9kZXMuXG4gICAgdmFyIHZpc2l0b3IgPSBuZXcgUGF0dGVyblZpc2l0b3Iocm9vdFBhdHRlcm4sIGNhbGxiYWNrKTtcbiAgICB2aXNpdG9yLnZpc2l0KHJvb3RQYXR0ZXJuKTtcblxuICAgIC8vIFByb2Nlc3MgdGhlIHJpZ2h0IGhhbmQgbm9kZXMgcmVjdXJzaXZlbHkuXG4gICAgaWYgKHJlZmVyZW5jZXIgIT0gbnVsbCkge1xuICAgICAgICB2aXNpdG9yLnJpZ2h0SGFuZE5vZGVzLmZvckVhY2gocmVmZXJlbmNlci52aXNpdCwgcmVmZXJlbmNlcik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBpc1BhdHRlcm4obm9kZSkge1xuICAgIHZhciBub2RlVHlwZSA9IG5vZGUudHlwZTtcbiAgICByZXR1cm4gKFxuICAgICAgICBub2RlVHlwZSA9PT0gU3ludGF4LklkZW50aWZpZXIgfHxcbiAgICAgICAgbm9kZVR5cGUgPT09IFN5bnRheC5PYmplY3RQYXR0ZXJuIHx8XG4gICAgICAgIG5vZGVUeXBlID09PSBTeW50YXguQXJyYXlQYXR0ZXJuIHx8XG4gICAgICAgIG5vZGVUeXBlID09PSBTeW50YXguU3ByZWFkRWxlbWVudCB8fFxuICAgICAgICBub2RlVHlwZSA9PT0gU3ludGF4LlJlc3RFbGVtZW50IHx8XG4gICAgICAgIG5vZGVUeXBlID09PSBTeW50YXguQXNzaWdubWVudFBhdHRlcm5cbiAgICApO1xufVxuXG4vLyBJbXBvcnRpbmcgSW1wb3J0RGVjbGFyYXRpb24uXG4vLyBodHRwOi8vcGVvcGxlLm1vemlsbGEub3JnL35qb3JlbmRvcmZmL2VzNi1kcmFmdC5odG1sI3NlYy1tb2R1bGVkZWNsYXJhdGlvbmluc3RhbnRpYXRpb25cbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9lc3RyZWUvZXN0cmVlL2Jsb2IvbWFzdGVyL2VzNi5tZCNpbXBvcnRkZWNsYXJhdGlvblxuLy8gRklYTUU6IE5vdywgd2UgZG9uJ3QgY3JlYXRlIG1vZHVsZSBlbnZpcm9ubWVudCwgYmVjYXVzZSB0aGUgY29udGV4dCBpc1xuLy8gaW1wbGVtZW50YXRpb24gZGVwZW5kZW50LlxuXG5jbGFzcyBJbXBvcnRlciBleHRlbmRzIGVzcmVjdXJzZS5WaXNpdG9yIHtcbiAgICBjb25zdHJ1Y3RvcihkZWNsYXJhdGlvbiwgcmVmZXJlbmNlcikge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmRlY2xhcmF0aW9uID0gZGVjbGFyYXRpb247XG4gICAgICAgIHRoaXMucmVmZXJlbmNlciA9IHJlZmVyZW5jZXI7XG4gICAgfVxuXG4gICAgdmlzaXRJbXBvcnQoaWQsIHNwZWNpZmllcikge1xuICAgICAgICB0aGlzLnJlZmVyZW5jZXIudmlzaXRQYXR0ZXJuKGlkLCAocGF0dGVybikgPT4ge1xuICAgICAgICAgICAgdGhpcy5yZWZlcmVuY2VyLmN1cnJlbnRTY29wZSgpLl9fZGVmaW5lKHBhdHRlcm4sXG4gICAgICAgICAgICAgICAgbmV3IERlZmluaXRpb24oXG4gICAgICAgICAgICAgICAgICAgIFZhcmlhYmxlLkltcG9ydEJpbmRpbmcsXG4gICAgICAgICAgICAgICAgICAgIHBhdHRlcm4sXG4gICAgICAgICAgICAgICAgICAgIHNwZWNpZmllcixcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWNsYXJhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgbnVsbFxuICAgICAgICAgICAgICAgICAgICApKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgSW1wb3J0TmFtZXNwYWNlU3BlY2lmaWVyKG5vZGUpIHtcbiAgICAgICAgbGV0IGxvY2FsID0gKG5vZGUubG9jYWwgfHwgbm9kZS5pZCk7XG4gICAgICAgIGlmIChsb2NhbCkge1xuICAgICAgICAgICAgdGhpcy52aXNpdEltcG9ydChsb2NhbCwgbm9kZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBJbXBvcnREZWZhdWx0U3BlY2lmaWVyKG5vZGUpIHtcbiAgICAgICAgbGV0IGxvY2FsID0gKG5vZGUubG9jYWwgfHwgbm9kZS5pZCk7XG4gICAgICAgIHRoaXMudmlzaXRJbXBvcnQobG9jYWwsIG5vZGUpO1xuICAgIH1cblxuICAgIEltcG9ydFNwZWNpZmllcihub2RlKSB7XG4gICAgICAgIGxldCBsb2NhbCA9IChub2RlLmxvY2FsIHx8IG5vZGUuaWQpO1xuICAgICAgICBpZiAobm9kZS5uYW1lKSB7XG4gICAgICAgICAgICB0aGlzLnZpc2l0SW1wb3J0KG5vZGUubmFtZSwgbm9kZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnZpc2l0SW1wb3J0KGxvY2FsLCBub2RlKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gUmVmZXJlbmNpbmcgdmFyaWFibGVzIGFuZCBjcmVhdGluZyBiaW5kaW5ncy5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlZmVyZW5jZXIgZXh0ZW5kcyBlc3JlY3Vyc2UuVmlzaXRvciB7XG4gICAgY29uc3RydWN0b3Ioc2NvcGVNYW5hZ2VyKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuc2NvcGVNYW5hZ2VyID0gc2NvcGVNYW5hZ2VyO1xuICAgICAgICB0aGlzLnBhcmVudCA9IG51bGw7XG4gICAgICAgIHRoaXMuaXNJbm5lck1ldGhvZERlZmluaXRpb24gPSBmYWxzZTtcbiAgICB9XG5cbiAgICBjdXJyZW50U2NvcGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNjb3BlTWFuYWdlci5fX2N1cnJlbnRTY29wZTtcbiAgICB9XG5cbiAgICBjbG9zZShub2RlKSB7XG4gICAgICAgIHdoaWxlICh0aGlzLmN1cnJlbnRTY29wZSgpICYmIG5vZGUgPT09IHRoaXMuY3VycmVudFNjb3BlKCkuYmxvY2spIHtcbiAgICAgICAgICAgIHRoaXMuc2NvcGVNYW5hZ2VyLl9fY3VycmVudFNjb3BlID0gdGhpcy5jdXJyZW50U2NvcGUoKS5fX2Nsb3NlKHRoaXMuc2NvcGVNYW5hZ2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1c2hJbm5lck1ldGhvZERlZmluaXRpb24oaXNJbm5lck1ldGhvZERlZmluaXRpb24pIHtcbiAgICAgICAgdmFyIHByZXZpb3VzID0gdGhpcy5pc0lubmVyTWV0aG9kRGVmaW5pdGlvbjtcbiAgICAgICAgdGhpcy5pc0lubmVyTWV0aG9kRGVmaW5pdGlvbiA9IGlzSW5uZXJNZXRob2REZWZpbml0aW9uO1xuICAgICAgICByZXR1cm4gcHJldmlvdXM7XG4gICAgfVxuXG4gICAgcG9wSW5uZXJNZXRob2REZWZpbml0aW9uKGlzSW5uZXJNZXRob2REZWZpbml0aW9uKSB7XG4gICAgICAgIHRoaXMuaXNJbm5lck1ldGhvZERlZmluaXRpb24gPSBpc0lubmVyTWV0aG9kRGVmaW5pdGlvbjtcbiAgICB9XG5cbiAgICBtYXRlcmlhbGl6ZVREWlNjb3BlKG5vZGUsIGl0ZXJhdGlvbk5vZGUpIHtcbiAgICAgICAgLy8gaHR0cDovL3Blb3BsZS5tb3ppbGxhLm9yZy9+am9yZW5kb3JmZi9lczYtZHJhZnQuaHRtbCNzZWMtcnVudGltZS1zZW1hbnRpY3MtZm9yaW4tZGl2LW9mZXhwcmVzc2lvbmV2YWx1YXRpb24tYWJzdHJhY3Qtb3BlcmF0aW9uXG4gICAgICAgIC8vIFREWiBzY29wZSBoaWRlcyB0aGUgZGVjbGFyYXRpb24ncyBuYW1lcy5cbiAgICAgICAgdGhpcy5zY29wZU1hbmFnZXIuX19uZXN0VERaU2NvcGUobm9kZSwgaXRlcmF0aW9uTm9kZSk7XG4gICAgICAgIHRoaXMudmlzaXRWYXJpYWJsZURlY2xhcmF0aW9uKHRoaXMuY3VycmVudFNjb3BlKCksIFZhcmlhYmxlLlREWiwgaXRlcmF0aW9uTm9kZS5sZWZ0LCAwLCB0cnVlKTtcbiAgICB9XG5cbiAgICBtYXRlcmlhbGl6ZUl0ZXJhdGlvblNjb3BlKG5vZGUpIHtcbiAgICAgICAgLy8gR2VuZXJhdGUgaXRlcmF0aW9uIHNjb3BlIGZvciB1cHBlciBGb3JJbi9Gb3JPZiBTdGF0ZW1lbnRzLlxuICAgICAgICB2YXIgbGV0T3JDb25zdERlY2w7XG4gICAgICAgIHRoaXMuc2NvcGVNYW5hZ2VyLl9fbmVzdEZvclNjb3BlKG5vZGUpO1xuICAgICAgICBsZXRPckNvbnN0RGVjbCA9IG5vZGUubGVmdDtcbiAgICAgICAgdGhpcy52aXNpdFZhcmlhYmxlRGVjbGFyYXRpb24odGhpcy5jdXJyZW50U2NvcGUoKSwgVmFyaWFibGUuVmFyaWFibGUsIGxldE9yQ29uc3REZWNsLCAwKTtcbiAgICAgICAgdGhpcy52aXNpdFBhdHRlcm4obGV0T3JDb25zdERlY2wuZGVjbGFyYXRpb25zWzBdLmlkLCAocGF0dGVybikgPT4ge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50U2NvcGUoKS5fX3JlZmVyZW5jaW5nKHBhdHRlcm4sIFJlZmVyZW5jZS5XUklURSwgbm9kZS5yaWdodCwgbnVsbCwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHJlZmVyZW5jaW5nRGVmYXVsdFZhbHVlKHBhdHRlcm4sIGFzc2lnbm1lbnRzLCBtYXliZUltcGxpY2l0R2xvYmFsLCBpbml0KSB7XG4gICAgICAgIGNvbnN0IHNjb3BlID0gdGhpcy5jdXJyZW50U2NvcGUoKTtcbiAgICAgICAgYXNzaWdubWVudHMuZm9yRWFjaChhc3NpZ25tZW50ID0+IHtcbiAgICAgICAgICAgIHNjb3BlLl9fcmVmZXJlbmNpbmcoXG4gICAgICAgICAgICAgICAgcGF0dGVybixcbiAgICAgICAgICAgICAgICBSZWZlcmVuY2UuV1JJVEUsXG4gICAgICAgICAgICAgICAgYXNzaWdubWVudC5yaWdodCxcbiAgICAgICAgICAgICAgICBtYXliZUltcGxpY2l0R2xvYmFsLFxuICAgICAgICAgICAgICAgIHBhdHRlcm4gIT09IGFzc2lnbm1lbnQubGVmdCxcbiAgICAgICAgICAgICAgICBpbml0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdmlzaXRQYXR0ZXJuKG5vZGUsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgICAgICAgb3B0aW9ucyA9IHtwcm9jZXNzUmlnaHRIYW5kTm9kZXM6IGZhbHNlfVxuICAgICAgICB9XG4gICAgICAgIHRyYXZlcnNlSWRlbnRpZmllckluUGF0dGVybihcbiAgICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgICBvcHRpb25zLnByb2Nlc3NSaWdodEhhbmROb2RlcyA/IHRoaXMgOiBudWxsLFxuICAgICAgICAgICAgY2FsbGJhY2spO1xuICAgIH1cblxuICAgIHZpc2l0RnVuY3Rpb24obm9kZSkge1xuICAgICAgICB2YXIgaSwgaXo7XG4gICAgICAgIC8vIEZ1bmN0aW9uRGVjbGFyYXRpb24gbmFtZSBpcyBkZWZpbmVkIGluIHVwcGVyIHNjb3BlXG4gICAgICAgIC8vIE5PVEU6IE5vdCByZWZlcnJpbmcgdmFyaWFibGVTY29wZS4gSXQgaXMgaW50ZW5kZWQuXG4gICAgICAgIC8vIFNpbmNlXG4gICAgICAgIC8vICBpbiBFUzUsIEZ1bmN0aW9uRGVjbGFyYXRpb24gc2hvdWxkIGJlIGluIEZ1bmN0aW9uQm9keS5cbiAgICAgICAgLy8gIGluIEVTNiwgRnVuY3Rpb25EZWNsYXJhdGlvbiBzaG91bGQgYmUgYmxvY2sgc2NvcGVkLlxuICAgICAgICBpZiAobm9kZS50eXBlID09PSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbikge1xuICAgICAgICAgICAgLy8gaWQgaXMgZGVmaW5lZCBpbiB1cHBlciBzY29wZVxuICAgICAgICAgICAgdGhpcy5jdXJyZW50U2NvcGUoKS5fX2RlZmluZShub2RlLmlkLFxuICAgICAgICAgICAgICAgICAgICBuZXcgRGVmaW5pdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIFZhcmlhYmxlLkZ1bmN0aW9uTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBudWxsXG4gICAgICAgICAgICAgICAgICAgICkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRnVuY3Rpb25FeHByZXNzaW9uIHdpdGggbmFtZSBjcmVhdGVzIGl0cyBzcGVjaWFsIHNjb3BlO1xuICAgICAgICAvLyBGdW5jdGlvbkV4cHJlc3Npb25OYW1lU2NvcGUuXG4gICAgICAgIGlmIChub2RlLnR5cGUgPT09IFN5bnRheC5GdW5jdGlvbkV4cHJlc3Npb24gJiYgbm9kZS5pZCkge1xuICAgICAgICAgICAgdGhpcy5zY29wZU1hbmFnZXIuX19uZXN0RnVuY3Rpb25FeHByZXNzaW9uTmFtZVNjb3BlKG5vZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29uc2lkZXIgdGhpcyBmdW5jdGlvbiBpcyBpbiB0aGUgTWV0aG9kRGVmaW5pdGlvbi5cbiAgICAgICAgdGhpcy5zY29wZU1hbmFnZXIuX19uZXN0RnVuY3Rpb25TY29wZShub2RlLCB0aGlzLmlzSW5uZXJNZXRob2REZWZpbml0aW9uKTtcblxuICAgICAgICAvLyBQcm9jZXNzIHBhcmFtZXRlciBkZWNsYXJhdGlvbnMuXG4gICAgICAgIGZvciAoaSA9IDAsIGl6ID0gbm9kZS5wYXJhbXMubGVuZ3RoOyBpIDwgaXo7ICsraSkge1xuICAgICAgICAgICAgdGhpcy52aXNpdFBhdHRlcm4obm9kZS5wYXJhbXNbaV0sIHtwcm9jZXNzUmlnaHRIYW5kTm9kZXM6IHRydWV9LCAocGF0dGVybiwgaW5mbykgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFNjb3BlKCkuX19kZWZpbmUocGF0dGVybixcbiAgICAgICAgICAgICAgICAgICAgbmV3IFBhcmFtZXRlckRlZmluaXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXR0ZXJuLFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGksXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmZvLnJlc3RcbiAgICAgICAgICAgICAgICAgICAgKSk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLnJlZmVyZW5jaW5nRGVmYXVsdFZhbHVlKHBhdHRlcm4sIGluZm8uYXNzaWdubWVudHMsIG51bGwsIHRydWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZiB0aGVyZSdzIGEgcmVzdCBhcmd1bWVudCwgYWRkIHRoYXRcbiAgICAgICAgaWYgKG5vZGUucmVzdCkge1xuICAgICAgICAgICAgdGhpcy52aXNpdFBhdHRlcm4oe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdSZXN0RWxlbWVudCcsXG4gICAgICAgICAgICAgICAgYXJndW1lbnQ6IG5vZGUucmVzdFxuICAgICAgICAgICAgfSwgKHBhdHRlcm4pID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRTY29wZSgpLl9fZGVmaW5lKHBhdHRlcm4sXG4gICAgICAgICAgICAgICAgICAgIG5ldyBQYXJhbWV0ZXJEZWZpbml0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0dGVybixcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnBhcmFtcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnVlXG4gICAgICAgICAgICAgICAgICAgICkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTa2lwIEJsb2NrU3RhdGVtZW50IHRvIHByZXZlbnQgY3JlYXRpbmcgQmxvY2tTdGF0ZW1lbnQgc2NvcGUuXG4gICAgICAgIGlmIChub2RlLmJvZHkudHlwZSA9PT0gU3ludGF4LkJsb2NrU3RhdGVtZW50KSB7XG4gICAgICAgICAgICB0aGlzLnZpc2l0Q2hpbGRyZW4obm9kZS5ib2R5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMudmlzaXQobm9kZS5ib2R5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY2xvc2Uobm9kZSk7XG4gICAgfVxuXG4gICAgdmlzaXRDbGFzcyhub2RlKSB7XG4gICAgICAgIGlmIChub2RlLnR5cGUgPT09IFN5bnRheC5DbGFzc0RlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRTY29wZSgpLl9fZGVmaW5lKG5vZGUuaWQsXG4gICAgICAgICAgICAgICAgICAgIG5ldyBEZWZpbml0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgVmFyaWFibGUuQ2xhc3NOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG51bGxcbiAgICAgICAgICAgICAgICAgICAgKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGSVhNRTogTWF5YmUgY29uc2lkZXIgVERaLlxuICAgICAgICB0aGlzLnZpc2l0KG5vZGUuc3VwZXJDbGFzcyk7XG5cbiAgICAgICAgdGhpcy5zY29wZU1hbmFnZXIuX19uZXN0Q2xhc3NTY29wZShub2RlKTtcblxuICAgICAgICBpZiAobm9kZS5pZCkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50U2NvcGUoKS5fX2RlZmluZShub2RlLmlkLFxuICAgICAgICAgICAgICAgICAgICBuZXcgRGVmaW5pdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIFZhcmlhYmxlLkNsYXNzTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlXG4gICAgICAgICAgICAgICAgICAgICkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudmlzaXQobm9kZS5ib2R5KTtcblxuICAgICAgICB0aGlzLmNsb3NlKG5vZGUpO1xuICAgIH1cblxuICAgIHZpc2l0UHJvcGVydHkobm9kZSkge1xuICAgICAgICB2YXIgcHJldmlvdXMsIGlzTWV0aG9kRGVmaW5pdGlvbjtcbiAgICAgICAgaWYgKG5vZGUuY29tcHV0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMudmlzaXQobm9kZS5rZXkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaXNNZXRob2REZWZpbml0aW9uID0gbm9kZS50eXBlID09PSBTeW50YXguTWV0aG9kRGVmaW5pdGlvbjtcbiAgICAgICAgaWYgKGlzTWV0aG9kRGVmaW5pdGlvbikge1xuICAgICAgICAgICAgcHJldmlvdXMgPSB0aGlzLnB1c2hJbm5lck1ldGhvZERlZmluaXRpb24odHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy52aXNpdChub2RlLnZhbHVlKTtcbiAgICAgICAgaWYgKGlzTWV0aG9kRGVmaW5pdGlvbikge1xuICAgICAgICAgICAgdGhpcy5wb3BJbm5lck1ldGhvZERlZmluaXRpb24ocHJldmlvdXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmlzaXRGb3JJbihub2RlKSB7XG4gICAgICAgIGlmIChub2RlLmxlZnQudHlwZSA9PT0gU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRpb24gJiYgbm9kZS5sZWZ0LmtpbmQgIT09ICd2YXInKSB7XG4gICAgICAgICAgICB0aGlzLm1hdGVyaWFsaXplVERaU2NvcGUobm9kZS5yaWdodCwgbm9kZSk7XG4gICAgICAgICAgICB0aGlzLnZpc2l0KG5vZGUucmlnaHQpO1xuICAgICAgICAgICAgdGhpcy5jbG9zZShub2RlLnJpZ2h0KTtcblxuICAgICAgICAgICAgdGhpcy5tYXRlcmlhbGl6ZUl0ZXJhdGlvblNjb3BlKG5vZGUpO1xuICAgICAgICAgICAgdGhpcy52aXNpdChub2RlLmJvZHkpO1xuICAgICAgICAgICAgdGhpcy5jbG9zZShub2RlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChub2RlLmxlZnQudHlwZSA9PT0gU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRpb24pIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZpc2l0KG5vZGUubGVmdCk7XG4gICAgICAgICAgICAgICAgdGhpcy52aXNpdFBhdHRlcm4obm9kZS5sZWZ0LmRlY2xhcmF0aW9uc1swXS5pZCwgKHBhdHRlcm4pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50U2NvcGUoKS5fX3JlZmVyZW5jaW5nKHBhdHRlcm4sIFJlZmVyZW5jZS5XUklURSwgbm9kZS5yaWdodCwgbnVsbCwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMudmlzaXRQYXR0ZXJuKG5vZGUubGVmdCwge3Byb2Nlc3NSaWdodEhhbmROb2RlczogdHJ1ZX0sIChwYXR0ZXJuLCBpbmZvKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtYXliZUltcGxpY2l0R2xvYmFsID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRTY29wZSgpLmlzU3RyaWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXliZUltcGxpY2l0R2xvYmFsID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdHRlcm46IHBhdHRlcm4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZTogbm9kZVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZmVyZW5jaW5nRGVmYXVsdFZhbHVlKHBhdHRlcm4sIGluZm8uYXNzaWdubWVudHMsIG1heWJlSW1wbGljaXRHbG9iYWwsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50U2NvcGUoKS5fX3JlZmVyZW5jaW5nKHBhdHRlcm4sIFJlZmVyZW5jZS5XUklURSwgbm9kZS5yaWdodCwgbWF5YmVJbXBsaWNpdEdsb2JhbCwgdHJ1ZSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy52aXNpdChub2RlLnJpZ2h0KTtcbiAgICAgICAgICAgIHRoaXMudmlzaXQobm9kZS5ib2R5KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZpc2l0VmFyaWFibGVEZWNsYXJhdGlvbih2YXJpYWJsZVRhcmdldFNjb3BlLCB0eXBlLCBub2RlLCBpbmRleCwgZnJvbVREWikge1xuICAgICAgICAvLyBJZiB0aGlzIHdhcyBjYWxsZWQgdG8gaW5pdGlhbGl6ZSBhIFREWiBzY29wZSwgdGhpcyBuZWVkcyB0byBtYWtlIGRlZmluaXRpb25zLCBidXQgZG9lc24ndCBtYWtlIHJlZmVyZW5jZXMuXG4gICAgICAgIHZhciBkZWNsLCBpbml0O1xuXG4gICAgICAgIGRlY2wgPSBub2RlLmRlY2xhcmF0aW9uc1tpbmRleF07XG4gICAgICAgIGluaXQgPSBkZWNsLmluaXQ7XG4gICAgICAgIHRoaXMudmlzaXRQYXR0ZXJuKGRlY2wuaWQsIHtwcm9jZXNzUmlnaHRIYW5kTm9kZXM6ICFmcm9tVERafSwgKHBhdHRlcm4sIGluZm8pID0+IHtcbiAgICAgICAgICAgIHZhcmlhYmxlVGFyZ2V0U2NvcGUuX19kZWZpbmUocGF0dGVybixcbiAgICAgICAgICAgICAgICBuZXcgRGVmaW5pdGlvbihcbiAgICAgICAgICAgICAgICAgICAgdHlwZSxcbiAgICAgICAgICAgICAgICAgICAgcGF0dGVybixcbiAgICAgICAgICAgICAgICAgICAgZGVjbCxcbiAgICAgICAgICAgICAgICAgICAgbm9kZSxcbiAgICAgICAgICAgICAgICAgICAgaW5kZXgsXG4gICAgICAgICAgICAgICAgICAgIG5vZGUua2luZFxuICAgICAgICAgICAgICAgICkpO1xuXG4gICAgICAgICAgICBpZiAoIWZyb21URFopIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZmVyZW5jaW5nRGVmYXVsdFZhbHVlKHBhdHRlcm4sIGluZm8uYXNzaWdubWVudHMsIG51bGwsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGluaXQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRTY29wZSgpLl9fcmVmZXJlbmNpbmcocGF0dGVybiwgUmVmZXJlbmNlLldSSVRFLCBpbml0LCBudWxsLCAhaW5mby50b3BMZXZlbCwgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIEFzc2lnbm1lbnRFeHByZXNzaW9uKG5vZGUpIHtcbiAgICAgICAgaWYgKGlzUGF0dGVybihub2RlLmxlZnQpKSB7XG4gICAgICAgICAgICBpZiAobm9kZS5vcGVyYXRvciA9PT0gJz0nKSB7XG4gICAgICAgICAgICAgICAgdGhpcy52aXNpdFBhdHRlcm4obm9kZS5sZWZ0LCB7cHJvY2Vzc1JpZ2h0SGFuZE5vZGVzOiB0cnVlfSwgKHBhdHRlcm4sIGluZm8pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1heWJlSW1wbGljaXRHbG9iYWwgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuY3VycmVudFNjb3BlKCkuaXNTdHJpY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heWJlSW1wbGljaXRHbG9iYWwgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0dGVybjogcGF0dGVybixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlOiBub2RlXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVmZXJlbmNpbmdEZWZhdWx0VmFsdWUocGF0dGVybiwgaW5mby5hc3NpZ25tZW50cywgbWF5YmVJbXBsaWNpdEdsb2JhbCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRTY29wZSgpLl9fcmVmZXJlbmNpbmcocGF0dGVybiwgUmVmZXJlbmNlLldSSVRFLCBub2RlLnJpZ2h0LCBtYXliZUltcGxpY2l0R2xvYmFsLCAhaW5mby50b3BMZXZlbCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRTY29wZSgpLl9fcmVmZXJlbmNpbmcobm9kZS5sZWZ0LCBSZWZlcmVuY2UuUlcsIG5vZGUucmlnaHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy52aXNpdChub2RlLmxlZnQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudmlzaXQobm9kZS5yaWdodCk7XG4gICAgfVxuXG4gICAgQ2F0Y2hDbGF1c2Uobm9kZSkge1xuICAgICAgICB0aGlzLnNjb3BlTWFuYWdlci5fX25lc3RDYXRjaFNjb3BlKG5vZGUpO1xuXG4gICAgICAgIHRoaXMudmlzaXRQYXR0ZXJuKG5vZGUucGFyYW0sIHtwcm9jZXNzUmlnaHRIYW5kTm9kZXM6IHRydWV9LCAocGF0dGVybiwgaW5mbykgPT4ge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50U2NvcGUoKS5fX2RlZmluZShwYXR0ZXJuLFxuICAgICAgICAgICAgICAgIG5ldyBEZWZpbml0aW9uKFxuICAgICAgICAgICAgICAgICAgICBWYXJpYWJsZS5DYXRjaENsYXVzZSxcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5wYXJhbSxcbiAgICAgICAgICAgICAgICAgICAgbm9kZSxcbiAgICAgICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgbnVsbFxuICAgICAgICAgICAgICAgICkpO1xuICAgICAgICAgICAgdGhpcy5yZWZlcmVuY2luZ0RlZmF1bHRWYWx1ZShwYXR0ZXJuLCBpbmZvLmFzc2lnbm1lbnRzLCBudWxsLCB0cnVlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMudmlzaXQobm9kZS5ib2R5KTtcblxuICAgICAgICB0aGlzLmNsb3NlKG5vZGUpO1xuICAgIH1cblxuICAgIFByb2dyYW0obm9kZSkge1xuICAgICAgICB0aGlzLnNjb3BlTWFuYWdlci5fX25lc3RHbG9iYWxTY29wZShub2RlKTtcblxuICAgICAgICBpZiAodGhpcy5zY29wZU1hbmFnZXIuX19pc05vZGVqc1Njb3BlKCkpIHtcbiAgICAgICAgICAgIC8vIEZvcmNlIHN0cmljdG5lc3Mgb2YgR2xvYmFsU2NvcGUgdG8gZmFsc2Ugd2hlbiB1c2luZyBub2RlLmpzIHNjb3BlLlxuICAgICAgICAgICAgdGhpcy5jdXJyZW50U2NvcGUoKS5pc1N0cmljdCA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5zY29wZU1hbmFnZXIuX19uZXN0RnVuY3Rpb25TY29wZShub2RlLCBmYWxzZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5zY29wZU1hbmFnZXIuX19pc0VTNigpICYmIHRoaXMuc2NvcGVNYW5hZ2VyLmlzTW9kdWxlKCkpIHtcbiAgICAgICAgICAgIHRoaXMuc2NvcGVNYW5hZ2VyLl9fbmVzdE1vZHVsZVNjb3BlKG5vZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy52aXNpdENoaWxkcmVuKG5vZGUpO1xuICAgICAgICB0aGlzLmNsb3NlKG5vZGUpO1xuICAgIH1cblxuICAgIElkZW50aWZpZXIobm9kZSkge1xuICAgICAgICB0aGlzLmN1cnJlbnRTY29wZSgpLl9fcmVmZXJlbmNpbmcobm9kZSk7XG4gICAgfVxuXG4gICAgVXBkYXRlRXhwcmVzc2lvbihub2RlKSB7XG4gICAgICAgIGlmIChpc1BhdHRlcm4obm9kZS5hcmd1bWVudCkpIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFNjb3BlKCkuX19yZWZlcmVuY2luZyhub2RlLmFyZ3VtZW50LCBSZWZlcmVuY2UuUlcsIG51bGwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy52aXNpdENoaWxkcmVuKG5vZGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgTWVtYmVyRXhwcmVzc2lvbihub2RlKSB7XG4gICAgICAgIHRoaXMudmlzaXQobm9kZS5vYmplY3QpO1xuICAgICAgICBpZiAobm9kZS5jb21wdXRlZCkge1xuICAgICAgICAgICAgdGhpcy52aXNpdChub2RlLnByb3BlcnR5KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIFByb3BlcnR5KG5vZGUpIHtcbiAgICAgICAgdGhpcy52aXNpdFByb3BlcnR5KG5vZGUpO1xuICAgIH1cblxuICAgIE1ldGhvZERlZmluaXRpb24obm9kZSkge1xuICAgICAgICB0aGlzLnZpc2l0UHJvcGVydHkobm9kZSk7XG4gICAgfVxuXG4gICAgQnJlYWtTdGF0ZW1lbnQoKSB7fVxuXG4gICAgQ29udGludWVTdGF0ZW1lbnQoKSB7fVxuXG4gICAgTGFiZWxlZFN0YXRlbWVudChub2RlKSB7XG4gICAgICAgIHRoaXMudmlzaXQobm9kZS5ib2R5KTtcbiAgICB9XG5cbiAgICBGb3JTdGF0ZW1lbnQobm9kZSkge1xuICAgICAgICAvLyBDcmVhdGUgRm9yU3RhdGVtZW50IGRlY2xhcmF0aW9uLlxuICAgICAgICAvLyBOT1RFOiBJbiBFUzYsIEZvclN0YXRlbWVudCBkeW5hbWljYWxseSBnZW5lcmF0ZXNcbiAgICAgICAgLy8gcGVyIGl0ZXJhdGlvbiBlbnZpcm9ubWVudC4gSG93ZXZlciwgZXNjb3BlIGlzXG4gICAgICAgIC8vIGEgc3RhdGljIGFuYWx5emVyLCB3ZSBvbmx5IGdlbmVyYXRlIG9uZSBzY29wZSBmb3IgRm9yU3RhdGVtZW50LlxuICAgICAgICBpZiAobm9kZS5pbml0ICYmIG5vZGUuaW5pdC50eXBlID09PSBTeW50YXguVmFyaWFibGVEZWNsYXJhdGlvbiAmJiBub2RlLmluaXQua2luZCAhPT0gJ3ZhcicpIHtcbiAgICAgICAgICAgIHRoaXMuc2NvcGVNYW5hZ2VyLl9fbmVzdEZvclNjb3BlKG5vZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy52aXNpdENoaWxkcmVuKG5vZGUpO1xuXG4gICAgICAgIHRoaXMuY2xvc2Uobm9kZSk7XG4gICAgfVxuXG4gICAgQ2xhc3NFeHByZXNzaW9uKG5vZGUpIHtcbiAgICAgICAgdGhpcy52aXNpdENsYXNzKG5vZGUpO1xuICAgIH1cblxuICAgIENsYXNzRGVjbGFyYXRpb24obm9kZSkge1xuICAgICAgICB0aGlzLnZpc2l0Q2xhc3Mobm9kZSk7XG4gICAgfVxuXG4gICAgQ2FsbEV4cHJlc3Npb24obm9kZSkge1xuICAgICAgICAvLyBDaGVjayB0aGlzIGlzIGRpcmVjdCBjYWxsIHRvIGV2YWxcbiAgICAgICAgaWYgKCF0aGlzLnNjb3BlTWFuYWdlci5fX2lnbm9yZUV2YWwoKSAmJiBub2RlLmNhbGxlZS50eXBlID09PSBTeW50YXguSWRlbnRpZmllciAmJiBub2RlLmNhbGxlZS5uYW1lID09PSAnZXZhbCcpIHtcbiAgICAgICAgICAgIC8vIE5PVEU6IFRoaXMgc2hvdWxkIGJlIGB2YXJpYWJsZVNjb3BlYC4gU2luY2UgZGlyZWN0IGV2YWwgY2FsbCBhbHdheXMgY3JlYXRlcyBMZXhpY2FsIGVudmlyb25tZW50IGFuZFxuICAgICAgICAgICAgLy8gbGV0IC8gY29uc3Qgc2hvdWxkIGJlIGVuY2xvc2VkIGludG8gaXQuIE9ubHkgVmFyaWFibGVEZWNsYXJhdGlvbiBhZmZlY3RzIG9uIHRoZSBjYWxsZXIncyBlbnZpcm9ubWVudC5cbiAgICAgICAgICAgIHRoaXMuY3VycmVudFNjb3BlKCkudmFyaWFibGVTY29wZS5fX2RldGVjdEV2YWwoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnZpc2l0Q2hpbGRyZW4obm9kZSk7XG4gICAgfVxuXG4gICAgQmxvY2tTdGF0ZW1lbnQobm9kZSkge1xuICAgICAgICBpZiAodGhpcy5zY29wZU1hbmFnZXIuX19pc0VTNigpKSB7XG4gICAgICAgICAgICB0aGlzLnNjb3BlTWFuYWdlci5fX25lc3RCbG9ja1Njb3BlKG5vZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy52aXNpdENoaWxkcmVuKG5vZGUpO1xuXG4gICAgICAgIHRoaXMuY2xvc2Uobm9kZSk7XG4gICAgfVxuXG4gICAgVGhpc0V4cHJlc3Npb24oKSB7XG4gICAgICAgIHRoaXMuY3VycmVudFNjb3BlKCkudmFyaWFibGVTY29wZS5fX2RldGVjdFRoaXMoKTtcbiAgICB9XG5cbiAgICBXaXRoU3RhdGVtZW50KG5vZGUpIHtcbiAgICAgICAgdGhpcy52aXNpdChub2RlLm9iamVjdCk7XG4gICAgICAgIC8vIFRoZW4gbmVzdCBzY29wZSBmb3IgV2l0aFN0YXRlbWVudC5cbiAgICAgICAgdGhpcy5zY29wZU1hbmFnZXIuX19uZXN0V2l0aFNjb3BlKG5vZGUpO1xuXG4gICAgICAgIHRoaXMudmlzaXQobm9kZS5ib2R5KTtcblxuICAgICAgICB0aGlzLmNsb3NlKG5vZGUpO1xuICAgIH1cblxuICAgIFZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSkge1xuICAgICAgICB2YXIgdmFyaWFibGVUYXJnZXRTY29wZSwgaSwgaXosIGRlY2w7XG4gICAgICAgIHZhcmlhYmxlVGFyZ2V0U2NvcGUgPSAobm9kZS5raW5kID09PSAndmFyJykgPyB0aGlzLmN1cnJlbnRTY29wZSgpLnZhcmlhYmxlU2NvcGUgOiB0aGlzLmN1cnJlbnRTY29wZSgpO1xuICAgICAgICBmb3IgKGkgPSAwLCBpeiA9IG5vZGUuZGVjbGFyYXRpb25zLmxlbmd0aDsgaSA8IGl6OyArK2kpIHtcbiAgICAgICAgICAgIGRlY2wgPSBub2RlLmRlY2xhcmF0aW9uc1tpXTtcbiAgICAgICAgICAgIHRoaXMudmlzaXRWYXJpYWJsZURlY2xhcmF0aW9uKHZhcmlhYmxlVGFyZ2V0U2NvcGUsIFZhcmlhYmxlLlZhcmlhYmxlLCBub2RlLCBpKTtcbiAgICAgICAgICAgIGlmIChkZWNsLmluaXQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZpc2l0KGRlY2wuaW5pdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBzZWMgMTMuMTEuOFxuICAgIFN3aXRjaFN0YXRlbWVudChub2RlKSB7XG4gICAgICAgIHZhciBpLCBpejtcblxuICAgICAgICB0aGlzLnZpc2l0KG5vZGUuZGlzY3JpbWluYW50KTtcblxuICAgICAgICBpZiAodGhpcy5zY29wZU1hbmFnZXIuX19pc0VTNigpKSB7XG4gICAgICAgICAgICB0aGlzLnNjb3BlTWFuYWdlci5fX25lc3RTd2l0Y2hTY29wZShub2RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoaSA9IDAsIGl6ID0gbm9kZS5jYXNlcy5sZW5ndGg7IGkgPCBpejsgKytpKSB7XG4gICAgICAgICAgICB0aGlzLnZpc2l0KG5vZGUuY2FzZXNbaV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jbG9zZShub2RlKTtcbiAgICB9XG5cbiAgICBGdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGUpIHtcbiAgICAgICAgdGhpcy52aXNpdEZ1bmN0aW9uKG5vZGUpO1xuICAgIH1cblxuICAgIEZ1bmN0aW9uRXhwcmVzc2lvbihub2RlKSB7XG4gICAgICAgIHRoaXMudmlzaXRGdW5jdGlvbihub2RlKTtcbiAgICB9XG5cbiAgICBGb3JPZlN0YXRlbWVudChub2RlKSB7XG4gICAgICAgIHRoaXMudmlzaXRGb3JJbihub2RlKTtcbiAgICB9XG5cbiAgICBGb3JJblN0YXRlbWVudChub2RlKSB7XG4gICAgICAgIHRoaXMudmlzaXRGb3JJbihub2RlKTtcbiAgICB9XG5cbiAgICBBcnJvd0Z1bmN0aW9uRXhwcmVzc2lvbihub2RlKSB7XG4gICAgICAgIHRoaXMudmlzaXRGdW5jdGlvbihub2RlKTtcbiAgICB9XG5cbiAgICBJbXBvcnREZWNsYXJhdGlvbihub2RlKSB7XG4gICAgICAgIHZhciBpbXBvcnRlcjtcblxuICAgICAgICBhc3NlcnQodGhpcy5zY29wZU1hbmFnZXIuX19pc0VTNigpICYmIHRoaXMuc2NvcGVNYW5hZ2VyLmlzTW9kdWxlKCksICdJbXBvcnREZWNsYXJhdGlvbiBzaG91bGQgYXBwZWFyIHdoZW4gdGhlIG1vZGUgaXMgRVM2IGFuZCBpbiB0aGUgbW9kdWxlIGNvbnRleHQuJyk7XG5cbiAgICAgICAgaW1wb3J0ZXIgPSBuZXcgSW1wb3J0ZXIobm9kZSwgdGhpcyk7XG4gICAgICAgIGltcG9ydGVyLnZpc2l0KG5vZGUpO1xuICAgIH1cblxuICAgIHZpc2l0RXhwb3J0RGVjbGFyYXRpb24obm9kZSkge1xuICAgICAgICBpZiAobm9kZS5zb3VyY2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAobm9kZS5kZWNsYXJhdGlvbikge1xuICAgICAgICAgICAgdGhpcy52aXNpdChub2RlLmRlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudmlzaXRDaGlsZHJlbihub2RlKTtcbiAgICB9XG5cbiAgICBFeHBvcnREZWNsYXJhdGlvbihub2RlKSB7XG4gICAgICAgIHRoaXMudmlzaXRFeHBvcnREZWNsYXJhdGlvbihub2RlKTtcbiAgICB9XG5cbiAgICBFeHBvcnROYW1lZERlY2xhcmF0aW9uKG5vZGUpIHtcbiAgICAgICAgdGhpcy52aXNpdEV4cG9ydERlY2xhcmF0aW9uKG5vZGUpO1xuICAgIH1cblxuICAgIEV4cG9ydFNwZWNpZmllcihub2RlKSB7XG4gICAgICAgIGxldCBsb2NhbCA9IChub2RlLmlkIHx8IG5vZGUubG9jYWwpO1xuICAgICAgICB0aGlzLnZpc2l0KGxvY2FsKTtcbiAgICB9XG59XG5cbi8qIHZpbTogc2V0IHN3PTQgdHM9NCBldCB0dz04MCA6ICovXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=