"use strict";
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractFunctionInfo = exports.processPackage = void 0;
var typescript_1 = require("typescript");
var worker_threads_1 = require("worker_threads");
var fs = require("fs");
var path = require("path");
var debug = process.env.NODE_ENV === 'dev';
var cwd = process.cwd();
var processedFilesMap = new Map();
worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.on('message', function (_a) {
    var action = _a.action, data = _a.data;
    return __awaiter(void 0, void 0, void 0, function () {
        var _b, directory, id, map, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _b = action;
                    switch (_b) {
                        case 'processPackage': return [3 /*break*/, 1];
                        case 'fileProcessed': return [3 /*break*/, 6];
                    }
                    return [3 /*break*/, 7];
                case 1:
                    _c.trys.push([1, 4, , 5]);
                    directory = data.directory, id = data.id, map = data.map;
                    if (!(action === 'processPackage')) return [3 /*break*/, 3];
                    return [4 /*yield*/, processPackage(directory, id, map)];
                case 2:
                    _c.sent();
                    process.exit(0);
                    _c.label = 3;
                case 3: return [3 /*break*/, 5];
                case 4:
                    error_1 = _c.sent();
                    log({ type: 'error', msg: "Error: ".concat(error_1) });
                    return [3 /*break*/, 5];
                case 5: return [3 /*break*/, 7];
                case 6:
                    // Only update if this worker didn't process the file
                    if (!processedFilesMap.has(data.fileName)) {
                        processedFilesMap.set(data.fileName, true);
                    }
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
});
function processPackage(directory, id, map) {
    return __awaiter(this, void 0, void 0, function () {
        var files, configPath, rootDirectory, configFile, parsed, program, checker, sourceFiles, packageMap, _i, sourceFiles_1, sourceFile, fileName, functions, _a, functions_1, func;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    files = getAllFiles(directory);
                    if (files.length === 0) {
                        log({
                            type: 'done',
                            id: id,
                            stat: "No .ts or .tsx files found in ".concat(directory, "."),
                        });
                        return [2 /*return*/];
                    }
                    processedFilesMap = new Map(map);
                    configPath = (0, typescript_1.findConfigFile)(directory, typescript_1.sys.fileExists, 'tsconfig.json');
                    if (!configPath)
                        throw new Error('Could not find a valid tsconfig.json');
                    rootDirectory = process.cwd();
                    log({ type: 'create', id: id, msg: "Creating program for ".concat(id, "...") });
                    configFile = (0, typescript_1.readConfigFile)(configPath, typescript_1.sys.readFile);
                    parsed = (0, typescript_1.parseJsonConfigFileContent)(configFile.config, typescript_1.sys, rootDirectory);
                    program = (0, typescript_1.createProgram)({
                        rootNames: files,
                        options: __assign(__assign({}, parsed.options), { noEmit: true }),
                    });
                    checker = program.getTypeChecker();
                    sourceFiles = program.getSourceFiles();
                    log({ type: 'total', total: sourceFiles.length });
                    packageMap = new Map();
                    _i = 0, sourceFiles_1 = sourceFiles;
                    _b.label = 1;
                case 1:
                    if (!(_i < sourceFiles_1.length)) return [3 /*break*/, 6];
                    sourceFile = sourceFiles_1[_i];
                    fileName = path.relative(cwd, sourceFile.fileName);
                    log({ type: 'processFile', fileName: fileName });
                    if (sourceFile.fileName.includes('node_modules'))
                        return [3 /*break*/, 5];
                    if (sourceFile.fileName.includes('.d.ts'))
                        return [3 /*break*/, 5];
                    if (processedFilesMap.has(fileName)) {
                        log({ type: 'foundDuplicate', filePath: fileName });
                        return [3 /*break*/, 5];
                    }
                    functions = extractFunctionInfo({ sourceFile: sourceFile, map: packageMap, checker: checker });
                    _a = 0, functions_1 = functions;
                    _b.label = 2;
                case 2:
                    if (!(_a < functions_1.length)) return [3 /*break*/, 5];
                    func = functions_1[_a];
                    return [4 /*yield*/, queueFunctionForBulkUpload(func)];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    _a++;
                    return [3 /*break*/, 2];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6:
                    log({ type: 'done', id: id });
                    return [2 /*return*/];
            }
        });
    });
}
exports.processPackage = processPackage;
function getAllFiles(dir) {
    return fs.readdirSync(dir).flatMap(function (entry) {
        var fullPath = path.join(dir, entry);
        return fs.statSync(fullPath).isDirectory()
            ? getAllFiles(fullPath)
            : /\.(ts|tsx)$/.test(fullPath)
                ? [fullPath]
                : [];
    });
}
function getFunctionName(node, sourceFile) {
    var _a, _b;
    // Direct function declarations and methods
    if ((0, typescript_1.isFunctionDeclaration)(node) || (0, typescript_1.isMethodDeclaration)(node)) {
        return ((_a = node.name) === null || _a === void 0 ? void 0 : _a.getText(sourceFile)) || 'anonymous';
    }
    // Arrow functions assigned to variables
    if ((0, typescript_1.isVariableDeclaration)(node) && node.initializer && (0, typescript_1.isArrowFunction)(node.initializer)) {
        return ((_b = node.name) === null || _b === void 0 ? void 0 : _b.getText(sourceFile)) || 'anonymous';
    }
    // Standalone arrow functions
    if ((0, typescript_1.isArrowFunction)(node)) {
        return 'anonymous';
    }
    if ((0, typescript_1.isVariableStatement)(node)) {
        for (var _i = 0, _c = node.declarationList.declarations; _i < _c.length; _i++) {
            var decl = _c[_i];
            if ((0, typescript_1.isVariableDeclaration)(decl) &&
                decl.initializer &&
                (0, typescript_1.isArrowFunction)(decl.initializer) &&
                (0, typescript_1.isIdentifier)(decl.name)) {
                return decl.name.text;
            }
        }
    }
    return 'noFunction';
}
function extractFunctionInfo(_a) {
    var sourceFile = _a.sourceFile, map = _a.map, checker = _a.checker;
    var fileName = path.relative(cwd, sourceFile.fileName);
    var functions = [];
    log({ type: 'update', msg: "Extracting functions from ".concat(fileName, "...") });
    function visit(node) {
        if ((0, typescript_1.isFunctionDeclaration)(node) ||
            (0, typescript_1.isMethodDeclaration)(node) ||
            (0, typescript_1.isArrowFunction)(node) ||
            (0, typescript_1.isVariableStatement)(node)) {
            var functionName = getFunctionName(node, sourceFile);
            if (functionName === 'noFunction')
                return;
            var functionNode = void 0;
            var id = "".concat(fileName.replaceAll('/', '-'), "_").concat(functionName);
            if (map.has(id))
                return;
            map.set(id, [fileName, functionName]);
            var startPos = node.getStart(sourceFile);
            var line = sourceFile.getLineAndCharacterOfPosition(startPos).line;
            if ((0, typescript_1.isFunctionDeclaration)(node) || (0, typescript_1.isMethodDeclaration)(node) || (0, typescript_1.isArrowFunction)(node)) {
                functionNode = node;
            }
            else if ((0, typescript_1.isVariableStatement)(node)) {
                var decl = node.declarationList.declarations[0];
                if ((0, typescript_1.isVariableDeclaration)(decl) && decl.initializer && (0, typescript_1.isArrowFunction)(decl.initializer)) {
                    functionNode = decl.initializer;
                }
            }
            var returnType = 'any';
            if (functionNode) {
                // Get return type from signature if available
                var signature = checker.getSignatureFromDeclaration(functionNode);
                if (signature) {
                    var retType = checker.getReturnTypeOfSignature(signature);
                    returnType = checker.typeToString(retType);
                }
            }
            // Use custom JSX detection which works for both concise and block arrow functions
            var returnsJSX = functionNode ? doesReturnJSX(functionNode) : false;
            var finalReturnType = returnsJSX ? 'JSX.Element (or React component)' : returnType;
            var functionDescription = "'".concat(functionName.replace(/([a-z])([A-Z])/g, '$1 $2'), "' is a function that returns a ").concat(returnsJSX ? 'React component' : "value of type \"".concat(returnType, "\""));
            var parameters = getFunctionParameters(functionNode, sourceFile, checker);
            var info = {
                id: id,
                name: functionName,
                functionDescription: functionDescription,
                line: line,
                filePath: fileName,
                parameters: parameters,
                returnType: finalReturnType,
                fullText: node.getText(sourceFile),
                normalizedCode: normalizeKibanaCode(node.getText(sourceFile)),
                returnsJSX: returnsJSX,
            };
            functions.push(info);
        }
        (0, typescript_1.forEachChild)(node, visit);
    }
    visit(sourceFile);
    return functions;
}
exports.extractFunctionInfo = extractFunctionInfo;
function getFunctionParameters(node, sourceFile, checker) {
    if (!node || !node.parameters)
        return undefined;
    return node.parameters.map(function (param) {
        var paramName = param.name.getText(sourceFile);
        var paramType = param.type
            ? checker.typeToString(checker.getTypeAtLocation(param.type))
            : undefined;
        var isOptional = !!param.questionToken;
        return {
            name: paramName,
            type: paramType,
            optional: isOptional,
        };
    });
}
function doesReturnJSX(node) {
    var foundJSX = false;
    function check(n, isRootFunction) {
        if (isRootFunction === void 0) { isRootFunction = false; }
        // Check return statements containing JSX
        if ((0, typescript_1.isReturnStatement)(n) && n.expression) {
            if (isJSXExpression(n.expression)) {
                foundJSX = true;
                return;
            }
        }
        // Check concise arrow function returning JSX directly
        if ((0, typescript_1.isArrowFunction)(n) && isJSXExpression(n.body)) {
            foundJSX = true;
            return;
        }
        // Don't traverse into nested functions (but do traverse the root function)
        if (!isRootFunction &&
            ((0, typescript_1.isFunctionDeclaration)(n) || (0, typescript_1.isArrowFunction)(n) || (0, typescript_1.isMethodDeclaration)(n))) {
            return;
        }
        (0, typescript_1.forEachChild)(n, function (child) { return check(child, false); });
    }
    check(node, true);
    return foundJSX;
}
function isJSXExpression(node) {
    return ((0, typescript_1.isJsxElement)(node) ||
        (0, typescript_1.isJsxSelfClosingElement)(node) ||
        (0, typescript_1.isJsxFragment)(node) ||
        // Handle parenthesized JSX expressions
        ((0, typescript_1.isParenthesizedExpression)(node) && isJSXExpression(node.expression)));
}
function normalizeKibanaCode(codeText) {
    var normalized = codeText;
    normalized = normalized.replace(/use[A-Z][a-zA-Z]*/g, 'useHOOK');
    normalized = normalized.replace(/\w+\.kibana\.\w+/g, 'kibana.API');
    normalized = normalized.replace(/\w+\.(vis|visualization)\.\w+/g, 'vis.API');
    normalized = normalized.replace(/(must|should|filter|must_not):\s*\[/g, 'QUERY_CLAUSE: [');
    normalized = normalized.replace(/\w+\.(buckets|aggregations|hits)\./g, 'data.STRUCTURE.');
    return normalizeCode(normalized);
}
function normalizeCode(codeText) {
    var normalized = codeText;
    normalized = normalized.replace(/\s+/g, ' ').trim();
    var keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while'];
    normalized = normalized.replace(/\b[a-z][a-zA-Z0-9]*\b/g, function (match) {
        if (keywords.includes(match))
            return match;
        return 'VAR';
    });
    normalized = normalized.replace(/"[^"]*"/g, '"STRING"');
    normalized = normalized.replace(/'[^']*'/g, "'STRING'");
    normalized = normalized.replace(/\b\d+(\.\d+)?\b/g, 'NUMBER');
    normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, '');
    normalized = normalized.replace(/\/\/.*$/gm, '');
    return normalized;
}
var BULK_BATCH_SIZE = 10;
var bulkQueue = [];
function queueFunctionForBulkUpload(func) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    bulkQueue.push(func);
                    if (!(bulkQueue.length >= BULK_BATCH_SIZE)) return [3 /*break*/, 2];
                    return [4 /*yield*/, flushBulkQueue()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    });
}
// Call this one final time after everything is processed
function flushBulkQueue() {
    return __awaiter(this, void 0, void 0, function () {
        var bulkBody, res, responseJson;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (bulkQueue.length === 0)
                        return [2 /*return*/];
                    bulkBody = bulkQueue.flatMap(function (func) {
                        var id = func.id, rest = __rest(func, ["id"]);
                        return [{ index: { _index: "kibana-ast", _id: id } }, rest];
                    });
                    return [4 /*yield*/, fetch("".concat("https://edge-lite-oblt-ccs-vbxbb.es.us-west2.gcp.elastic-cloud.com:443", "/_bulk"), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-ndjson',
                                Authorization: "Basic ".concat("ZWxhc3RpYzpORW9NRHlFdXFlellwSnFXYjU0ZGhiUXc="),
                            },
                            body: bulkBody.map(function (line) { return JSON.stringify(line); }).join('\n') + '\n',
                        })];
                case 1:
                    res = _a.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    responseJson = _a.sent();
                    if (!res.ok) {
                        log({
                            type: 'error',
                            msg: "Failed to bulk upload functions: ".concat(res.status, " - ").concat(res.statusText),
                        });
                    }
                    else if (responseJson.errors) {
                        log({
                            type: 'error',
                            msg: "Failed to bulk upload functions, ES errors: ".concat(JSON.stringify(responseJson, null, 2)),
                        });
                    }
                    bulkQueue.length = 0; // Clear queue
                    return [2 /*return*/];
            }
        });
    });
}
function log(args) {
    if (debug) {
        // eslint-disable-next-line no-console
        console.log("[Worker]", args);
    }
    else {
        worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.postMessage(args);
    }
}
