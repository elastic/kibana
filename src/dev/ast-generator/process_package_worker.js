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
var ES_HOST = 'http://localhost:9200';
var INDEX_NAME = 'kibana-ast';
var AUTH = Buffer.from('elastic:changeme').toString('base64');
var cwd = process.cwd();
worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.on('message', function (_a) {
    var action = _a.action, data = _a.data;
    return __awaiter(void 0, void 0, void 0, function () {
        var directory, id, map, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    directory = data.directory, id = data.id, map = data.map;
                    if (!(action === 'processPackage')) return [3 /*break*/, 2];
                    return [4 /*yield*/, processPackage(directory, id, map)];
                case 1:
                    _b.sent();
                    process.exit(0);
                    _b.label = 2;
                case 2: return [3 /*break*/, 4];
                case 3:
                    error_1 = _b.sent();
                    // Handle or report the error
                    console.error('worker error:', error_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
});
function processPackage(directory, id, map) {
    return __awaiter(this, void 0, void 0, function () {
        var files, processedFilesMap, configPath, rootDirectory, configFile, parsed, program, sourceFiles, packageMap, _i, sourceFiles_1, sourceFile, fileName, functions, _a, functions_1, func;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    files = getAllFiles(directory);
                    processedFilesMap = new Map(map);
                    if (files.length === 0) {
                        log({
                            type: 'done',
                            id: id,
                            stat: "No .ts or .tsx files found in ".concat(directory, "."),
                        });
                        return [2 /*return*/];
                    }
                    configPath = (0, typescript_1.findConfigFile)(directory, typescript_1.sys.fileExists, 'tsconfig.json');
                    if (!configPath)
                        throw new Error('Could not find a valid tsconfig.json');
                    rootDirectory = process.cwd();
                    log({ type: 'create', id: id, msg: "Creating program for ".concat(id) });
                    configFile = (0, typescript_1.readConfigFile)(configPath, typescript_1.sys.readFile);
                    parsed = (0, typescript_1.parseJsonConfigFileContent)(configFile.config, typescript_1.sys, rootDirectory);
                    program = (0, typescript_1.createProgram)({
                        rootNames: files,
                        options: __assign(__assign({}, parsed.options), { noEmit: true }),
                    });
                    sourceFiles = program.getSourceFiles();
                    log({ type: 'total', total: sourceFiles.length });
                    packageMap = new Map();
                    _i = 0, sourceFiles_1 = sourceFiles;
                    _b.label = 1;
                case 1:
                    if (!(_i < sourceFiles_1.length)) return [3 /*break*/, 6];
                    sourceFile = sourceFiles_1[_i];
                    fileName = path.relative(cwd, sourceFile.fileName);
                    log({ type: 'processFile', msg: "Processing ".concat(fileName) });
                    if (sourceFile.fileName.includes('node_modules'))
                        return [3 /*break*/, 5];
                    if (sourceFile.fileName.includes('.d.ts'))
                        return [3 /*break*/, 5];
                    if (processedFilesMap.has(fileName)) {
                        log({ type: 'foundDuplicate', filePath: fileName });
                        return [3 /*break*/, 5];
                    }
                    functions = extractFunctionInfo({ sourceFile: sourceFile, map: packageMap }) || [];
                    _a = 0, functions_1 = functions;
                    _b.label = 2;
                case 2:
                    if (!(_a < functions_1.length)) return [3 /*break*/, 5];
                    func = functions_1[_a];
                    return [4 /*yield*/, queueFunctionForBulkUpload(func, worker_threads_1.parentPort)];
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
function extractFunctionInfo(_a) {
    var sourceFile = _a.sourceFile, map = _a.map;
    var functions = [];
    var fileName = path.relative(cwd, sourceFile.fileName);
    log({ type: 'update', msg: "Extracting functions from ".concat(fileName) });
    function getFunctionName(node) {
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
        return 'unknown';
    }
    function visit(node) {
        if ((0, typescript_1.isFunctionDeclaration)(node) ||
            (0, typescript_1.isMethodDeclaration)(node) ||
            (0, typescript_1.isArrowFunction)(node) ||
            ((0, typescript_1.isVariableDeclaration)(node) && node.initializer && (0, typescript_1.isArrowFunction)(node.initializer))) {
            var functionName = getFunctionName(node);
            var id = "".concat(fileName.replaceAll('/', '-'), "_").concat(functionName);
            if (map.has(id))
                return;
            map.set(id, [fileName, functionName]);
            var startPos = node.getStart(sourceFile);
            var line = sourceFile.getLineAndCharacterOfPosition(startPos).line;
            var returnType = node.type ? node.type.getText(sourceFile) : 'void';
            var functionDescription = "'".concat(functionName.replace(/([a-z])([A-Z])/g, '$1 $2'), "' is a function that returns");
            if (node.type) {
                functionDescription += " a value of type '".concat(returnType, "'.");
            }
            else {
                functionDescription += ' a value of unknown type.';
            }
            var functionNode = void 0;
            if ((0, typescript_1.isFunctionDeclaration)(node) || (0, typescript_1.isMethodDeclaration)(node) || (0, typescript_1.isArrowFunction)(node)) {
                functionNode = node;
            }
            else if ((0, typescript_1.isVariableDeclaration)(node) &&
                node.initializer &&
                (0, typescript_1.isArrowFunction)(node.initializer)) {
                functionNode = node.initializer; // The arrow function is in the initializer
            }
            var info = {
                id: id,
                name: functionName,
                functionDescription: functionDescription,
                startLine: line,
                filePath: path.relative(cwd, sourceFile.fileName),
                parameters: functionNode === null || functionNode === void 0 ? void 0 : functionNode.parameters.map(function (param) {
                    var _a;
                    return ({
                        name: param.name ? param.name.getText(sourceFile) : 'anonymous',
                        type: (_a = param.type) === null || _a === void 0 ? void 0 : _a.getText(sourceFile),
                        optional: !!param.questionToken,
                    });
                }),
                returnType: returnType,
                fullText: node.getText(sourceFile),
                normalizedCode: normalizeKibanaCode(node.getText(sourceFile)),
                astFeatures: {},
            };
            functions.push(info);
        }
        (0, typescript_1.forEachChild)(node, visit);
    }
    visit(sourceFile);
    return functions;
}
exports.extractFunctionInfo = extractFunctionInfo;
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
function queueFunctionForBulkUpload(func, messagePort) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    bulkQueue.push(func);
                    if (!(bulkQueue.length >= BULK_BATCH_SIZE)) return [3 /*break*/, 2];
                    return [4 /*yield*/, flushBulkQueue(messagePort)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    });
}
// Call this one final time after everything is processed
function flushBulkQueue(messagePort) {
    return __awaiter(this, void 0, void 0, function () {
        var bulkBody, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (bulkQueue.length === 0)
                        return [2 /*return*/];
                    bulkBody = bulkQueue.flatMap(function (func) {
                        var id = func.id, rest = __rest(func, ["id"]);
                        return [{ index: { _index: INDEX_NAME, _id: id } }, rest];
                    });
                    return [4 /*yield*/, fetch("".concat(ES_HOST, "/_bulk"), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-ndjson',
                                Authorization: "Basic ".concat(AUTH),
                            },
                            body: bulkBody.map(function (line) { return JSON.stringify(line); }).join('\n') + '\n',
                        })];
                case 1:
                    res = _a.sent();
                    if (!res.ok) {
                        log({
                            type: 'error',
                            msg: "Failed to bulk upload functions: ".concat(res.status, " - ").concat(res.statusText),
                        });
                    }
                    bulkQueue.length = 0; // Clear queue
                    return [2 /*return*/];
            }
        });
    });
}
function log(args) {
    //   console.log(args);
    worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.postMessage(args);
}
