"use strict";
/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const references_1 = require("./references");
const types_1 = require("./types");
exports.ObjectType = types_1.ObjectType;
exports.Type = types_1.Type;
var byte_size_value_1 = require("./byte_size_value");
exports.ByteSizeValue = byte_size_value_1.ByteSizeValue;
function any(options) {
    return new types_1.AnyType(options);
}
function boolean(options) {
    return new types_1.BooleanType(options);
}
function string(options) {
    return new types_1.StringType(options);
}
function uri(options) {
    return new types_1.URIType(options);
}
function literal(value) {
    return new types_1.LiteralType(value);
}
function number(options) {
    return new types_1.NumberType(options);
}
function byteSize(options) {
    return new types_1.ByteSizeType(options);
}
function duration(options) {
    return new types_1.DurationType(options);
}
function never() {
    return new types_1.NeverType();
}
/**
 * Create an optional type
 */
function maybe(type) {
    return new types_1.MaybeType(type);
}
function nullable(type) {
    return new types_1.NullableType(type);
}
function object(props, options) {
    return new types_1.ObjectType(props, options);
}
function arrayOf(itemType, options) {
    return new types_1.ArrayType(itemType, options);
}
function mapOf(keyType, valueType, options) {
    return new types_1.MapOfType(keyType, valueType, options);
}
function recordOf(keyType, valueType, options) {
    return new types_1.RecordOfType(keyType, valueType, options);
}
function oneOf(types, options) {
    return new types_1.UnionType(types, options);
}
function contextRef(key) {
    return new references_1.ContextReference(key);
}
function siblingRef(key) {
    return new references_1.SiblingReference(key);
}
function conditional(leftOperand, rightOperand, equalType, notEqualType, options) {
    return new types_1.ConditionalType(leftOperand, rightOperand, equalType, notEqualType, options);
}
exports.schema = {
    any,
    arrayOf,
    boolean,
    byteSize,
    conditional,
    contextRef,
    duration,
    literal,
    mapOf,
    maybe,
    nullable,
    never,
    number,
    object,
    oneOf,
    recordOf,
    siblingRef,
    string,
    uri,
};
