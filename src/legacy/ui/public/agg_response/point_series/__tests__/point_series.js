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


describe('Point Series Agg Response', function () {
  require ('./_main');
  require('./_add_to_siri');
  require('./_fake_x_aspect');
  require('./_get_aspects');
  require('./_get_point');
  require('./_get_series');
  require('./_init_x_axis');
  require('./_init_y_axis');
  require('./_ordered_date_axis');
});
