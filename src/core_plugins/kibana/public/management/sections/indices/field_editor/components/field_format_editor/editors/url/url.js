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

import React, { Fragment } from 'react';

import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiCode,
  EuiFieldText,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFormRow,
  EuiLink,
  EuiSelect,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';

import {
  DefaultFormatEditor
} from '../default';

import {
  FormatEditorSamples
} from '../../samples';

import chrome from 'ui/chrome';

export class UrlFormatEditor extends DefaultFormatEditor {
  static formatId = 'url';

  constructor(props) {
    super(props);
    this.iconPattern = `${chrome.getBasePath()}/bundles/src/ui/public/field_format_editor/editors/url/icons/{{value}}.png`;
    this.state = {
      ...this.state,
      sampleInputsByType: {
        a: [ 'john', '/some/pathname/asset.png', 1234 ],
        img: [ 'go', 'stop', ['de', 'ne', 'us', 'ni'], 'cv' ],
        audio: [ 'hello.mp3' ],
      },
      sampleConverterType: 'html',
      showUrlTemplateHelp: false,
      showLabelTemplateHelp: false,
    };
  }

  onTypeChange = (newType) => {
    const { urlTemplate } = this.props.formatParams;
    if(newType === 'img' && !urlTemplate) {
      this.onChange({
        type: newType,
        urlTemplate: this.iconPattern,
      });
    } else if(newType !== 'img' && urlTemplate === this.iconPattern) {
      this.onChange({
        type: newType,
        urlTemplate: null,
      });
    } else {
      this.onChange({
        type: newType,
      });
    }
  }

  renderUrlTemplateFlyout() {
    return this.state.showUrlTemplateHelp ? (
      <EuiFlyout
        onClose={this.hideUrlTemplateHelp}
        size="l"
      >
        <EuiFlyoutBody>
          <EuiText>
            <h3>Url Template</h3>
            <p>
              If a field only contains part of a URL then a <strong>Url Template</strong> can be used to format the value
              as a complete URL. The format is a string which uses double curly brace notation <EuiCode>{('{{ }}')}</EuiCode>
              to inject values. The following values can be accessed:
            </p>
            <ul>
              <li>
                <EuiCode>value</EuiCode> &mdash; The URI-escaped value
              </li>
              <li>
                <EuiCode>rawValue</EuiCode> &mdash; The unescaped value
              </li>
            </ul>
            <h4>Examples</h4>
            <EuiBasicTable
              items={[
                {
                  input: 1234,
                  template: 'http://company.net/profiles?user_id={{value}}',
                  output: 'http://company.net/profiles?user_id=1234',
                },
                {
                  input: 'users/admin',
                  template: 'http://company.net/groups?id={{value}',
                  output: 'http://company.net/groups?id=users%2Fadmin',
                },
                {
                  input: '/images/favicon.ico',
                  template: 'http://www.site.com{{rawValue}}',
                  output: 'http://www.site.com/images/favicon.ico',
                },
              ]}
              columns={[
                {
                  field: 'input',
                  name: 'Input',
                  width: '160px',
                },
                {
                  field: 'template',
                  name: 'Template',
                },
                {
                  field: 'output',
                  name: 'Output',
                },
              ]}
            />
          </EuiText>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiButtonEmpty
            iconType="cross"
            onClick={this.hideUrlTemplateHelp}
          >
            Close
          </EuiButtonEmpty>
        </EuiFlyoutFooter>
      </EuiFlyout>
    ) : null;
  }

  showUrlTemplateHelp = () => {
    this.setState({
      showLabelTemplateHelp: false,
      showUrlTemplateHelp: true,
    });
  }

  hideUrlTemplateHelp = () => {
    this.setState({
      showUrlTemplateHelp: false,
    });
  }

  renderLabelTemplateFlyout() {
    return this.state.showLabelTemplateHelp ? (
      <EuiFlyout
        onClose={this.hideLabelTemplateHelp}
        size="l"
      >
        <EuiFlyoutBody>
          <EuiText>
            <h3>Label Template</h3>
            <p>
              If the URL in this field is large, it might be useful to provide an alternate template for the text
              version of the URL. This will be displayed instead of the url, but will still link to the URL. The
              format is a string which uses double curly brace notation <EuiCode>{('{{ }}')}</EuiCode>
              to inject values. The following values can be accessed:
            </p>
            <ul>
              <li>
                <EuiCode>value</EuiCode> &mdash; The fields value
              </li>
              <li>
                <EuiCode>url</EuiCode> &mdash; The formatted URL
              </li>
            </ul>
            <h4>Examples</h4>
            <EuiBasicTable
              items={[
                {
                  input: 1234,
                  urlTemplate: 'http://company.net/profiles?user_id={{value}}',
                  labelTemplate: 'User #{{value}}',
                  output: '<a href="http://company.net/profiles?user_id=1234">User #1234</a>',
                },
                {
                  input: '/assets/main.css',
                  urlTemplate: 'http://site.com{{rawValue}}',
                  labelTemplate: 'View Asset',
                  output: '<a href="http://site.com/assets/main.css">View Asset</a>',
                },
              ]}
              columns={[
                {
                  field: 'input',
                  name: 'Input',
                  width: '160px',
                },
                {
                  field: 'urlTemplate',
                  name: 'URL Template',
                },
                {
                  field: 'labelTemplate',
                  name: 'Label Template',
                },
                {
                  field: 'output',
                  name: 'Output',
                  render: (value) => {
                    return (
                      <span
                        /*
                         * Justification for dangerouslySetInnerHTML:
                         * Example output produces anchor link.
                         */
                        dangerouslySetInnerHTML={{ __html: value }} //eslint-disable-line react/no-danger
                      />
                    );
                  }
                },
              ]}
            />
          </EuiText>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiButtonEmpty
            iconType="cross"
            onClick={this.hideLabelTemplateHelp}
          >
            Close
          </EuiButtonEmpty>
        </EuiFlyoutFooter>
      </EuiFlyout>
    ) : null;
  }

  showLabelTemplateHelp = () => {
    this.setState({
      showLabelTemplateHelp: true,
      showUrlTemplateHelp: false,
    });
  }

  hideLabelTemplateHelp = () => {
    this.setState({
      showLabelTemplateHelp: false,
    });
  }

  render() {
    const { format, formatParams } = this.props;
    const { error, samples } = this.state;

    return (
      <Fragment>
        {this.renderUrlTemplateFlyout()}
        {this.renderLabelTemplateFlyout()}
        <EuiFormRow
          label="Type"
          // isInvalid={!!error}
          // error={error}
        >
          <EuiSelect
            defaultValue={formatParams.type}
            options={format.type.urlTypes.map(type => {
              return {
                value: type.kind,
                text: type.text,
              };
            })}
            onChange={(e) => {
              this.onTypeChange(e.target.value);
            }}
          />
        </EuiFormRow>

        {formatParams.type === 'a' ? (
          <EuiFormRow label="Open in a new tab">
            <EuiSwitch
              label={formatParams.openLinkInCurrentTab ? 'Off' : 'On'}
              checked={!formatParams.openLinkInCurrentTab}
              onChange={(e) => {
                this.onChange({ openLinkInCurrentTab: !e.target.checked });
              }}
            />
          </EuiFormRow>
        ) : null}

        <EuiFormRow
          label="Url template"
          helpText={(<EuiLink onClick={this.showUrlTemplateHelp}>Url template help</EuiLink>)}
        >
          <EuiFieldText
            value={formatParams.urlTemplate || ''}
            onChange={(e) => {
              this.onChange({ urlTemplate: e.target.value });
            }}
          />
        </EuiFormRow>

        <EuiFormRow
          label="Label template"
          helpText={(<EuiLink onClick={this.showLabelTemplateHelp}>Label template help</EuiLink>)}
        >
          <EuiFieldText
            value={formatParams.labelTemplate || ''}
            onChange={(e) => {
              this.onChange({ labelTemplate: e.target.value });
            }}
          />
        </EuiFormRow>

        <FormatEditorSamples
          samples={samples}
        />
      </Fragment>
    );
  }
}

export const UrlEditor = () => UrlFormatEditor;
