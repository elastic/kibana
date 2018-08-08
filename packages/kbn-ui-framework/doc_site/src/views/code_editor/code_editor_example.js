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

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import CodeEditor from './code_editor';
const codeEditorSource = require('!!raw-loader!./code_editor');

import ReadOnly from './read_only';
const readOnlySource = require('!!raw-loader!./read_only');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Code Editor"
      source={[{
        type: GuideSectionTypes.JS,
        code: codeEditorSource,
      }]}
    >
      <GuideText>
        <p>
          The KuiCodeEditor component is a wrapper around <code>react-ace</code> (which
          itself wraps the ACE code editor), that adds an accessible keyboard mode
          to it. You should always use this component instead of <code>AceReact</code>.
        </p>
        <p>
          All parameters, that you specify are passed down to the
          underlying <code>AceReact</code> component.
        </p>
      </GuideText>

      <GuideDemo>
        <CodeEditor />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Read-only"
      source={[{
        type: GuideSectionTypes.JS,
        code: readOnlySource,
      }]}
    >
      <GuideDemo>
        <ReadOnly />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
