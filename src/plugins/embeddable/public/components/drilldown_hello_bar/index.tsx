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

import React from 'react';

export interface DrilldownHelloBarProps {
  docsLink?: string;
}

export const DrilldownHelloBar: React.FC<DrilldownHelloBarProps> = ({ docsLink }) => {
  return (
    <div>
      <p>
        Drilldowns provide the ability to define a new behavior when interacting with a panel. You
        can add multiple options or simply override the default filtering behavior.
      </p>
      <a href={docsLink}>View docs</a>
      <img
        src="https://user-images.githubusercontent.com/9773803/72729009-e5803180-3b8e-11ea-8330-b86089bf5f0a.png"
        alt=""
      />
    </div>
  );
};
