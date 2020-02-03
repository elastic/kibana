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

/**
 * This file needs to be deleted by 8.0 release. It is here to load available
 * server side functions and create a wrappers around them on client side, to
 * execute them from client side. This functionality is used only by Canvas
 * and all server side functions are in Canvas plugin.
 *
 * In 8.0 there will be no server-side functions, plugins will register only
 * client side functions and if they need those to execute something on the
 * server side, it should be respective function's internal implementation detail.
 */

import { npSetup } from 'ui/new_platform';

export const { loadLegacyServerFunctionWrappers } = npSetup.plugins.expressions.__LEGACY;
