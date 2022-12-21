/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
@TODO

The react-ace and brace/mode/json imports below are loaded eagerly - before this plugin is explicitly loaded by users. This makes
the brace JSON mode, used for JSON syntax highlighting and grammar checking, available across all of Kibana plugins.

This is not ideal because we are loading JS that is not necessary for Kibana to start, but the alternative
is breaking JSON mode for an unknown number of ace editors across Kibana - not all components reference the underlying
EuiCodeEditor (for instance, explicitly).

Importing here is a way of preventing a more sophisticated solution to this problem since we want to, eventually,
migrate all code editors over to Monaco. Once that is done, we should remove this import.
 */
import 'react-ace';
import 'brace/mode/json';

export * from './field';
export * from './form_row';
export * from './fields';
