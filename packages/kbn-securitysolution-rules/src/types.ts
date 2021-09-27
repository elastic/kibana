/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Copied from security_solution:
 *
 * Defines the search types you can have from Elasticsearch within a
 * doc._source. It uses recursive types of "| SearchTypes[]" to designate
 * anything can also be of a type array, and it uses the recursive type of
 * "| { [property: string]: SearchTypes }" to designate you can can sub-objects
 * or sub-sub-objects, etc...
 */
export type SearchTypes = string | number | boolean | object | SearchTypes[] | undefined;
