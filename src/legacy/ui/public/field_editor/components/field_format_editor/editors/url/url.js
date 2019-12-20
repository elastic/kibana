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
  EuiFieldText,
  EuiFormRow,
  EuiLink,
  EuiSelect,
  EuiSwitch,
  EuiFieldNumber,
} from '@elastic/eui';

import { DefaultFormatEditor } from '../default';

import { FormatEditorSamples } from '../../samples';

import { LabelTemplateFlyout } from './label_template_flyout';

import { UrlTemplateFlyout } from './url_template_flyout';

import chrome from 'ui/chrome';
import './icons';

import { FormattedMessage } from '@kbn/i18n/react';

export class UrlFormatEditor extends DefaultFormatEditor {
  static formatId = 'url';

  constructor(props) {
    super(props);
    const bp = chrome.getBasePath();
    this.iconPattern = `${bp}/bundles/src/legacy/ui/public/field_editor/components/field_format_editor/editors/url/icons/{{value}}.png`;
    this.state = {
      ...this.state,
      sampleInputsByType: {
        a: ['john', '/some/pathname/asset.png', 1234],
        img: ['go', 'stop', ['de', 'ne', 'us', 'ni'], 'cv'],
        audio: ['hello.mp3'],
      },
      sampleConverterType: 'html',
      showUrlTemplateHelp: false,
      showLabelTemplateHelp: false,
    };
  }

  sanitizeNumericValue = val => {
    const sanitizedValue = parseInt(val);
    if (isNaN(sanitizedValue)) {
      return '';
    }
    return sanitizedValue;
  };

  onTypeChange = newType => {
    const { urlTemplate, width, height } = this.props.formatParams;
    const params = {
      type: newType,
    };
    if (newType === 'img') {
      params.width = width;
      params.height = height;
      if (!urlTemplate) {
        params.urlTemplate = this.iconPattern;
      }
    } else if (newType !== 'img' && urlTemplate === this.iconPattern) {
      params.urlTemplate = null;
    }
    this.onChange(params);
  };

  showUrlTemplateHelp = () => {
    this.setState({
      showLabelTemplateHelp: false,
      showUrlTemplateHelp: true,
    });
  };

  hideUrlTemplateHelp = () => {
    this.setState({
      showUrlTemplateHelp: false,
    });
  };

  showLabelTemplateHelp = () => {
    this.setState({
      showLabelTemplateHelp: true,
      showUrlTemplateHelp: false,
    });
  };

  hideLabelTemplateHelp = () => {
    this.setState({
      showLabelTemplateHelp: false,
    });
  };

  renderWidthHeightParameters = () => {
    const width = this.sanitizeNumericValue(this.props.formatParams.width);
    const height = this.sanitizeNumericValue(this.props.formatParams.height);
    return (
      <Fragment>
        <EuiFormRow
          label={
            <FormattedMessage id="common.ui.fieldEditor.url.widthLabel" defaultMessage="Width" />
          }
        >
          <EuiFieldNumber
            data-test-subj="urlEditorWidth"
            value={width}
            onChange={e => {
              this.onChange({ width: e.target.value });
            }}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage id="common.ui.fieldEditor.url.heightLabel" defaultMessage="Height" />
          }
        >
          <EuiFieldNumber
            data-test-subj="urlEditorHeight"
            value={height}
            onChange={e => {
              this.onChange({ height: e.target.value });
            }}
          />
        </EuiFormRow>
      </Fragment>
    );
  };

  render() {
    const { format, formatParams } = this.props;
    const { error, samples, sampleConverterType } = this.state;

    return (
      <Fragment>
        <LabelTemplateFlyout
          isVisible={this.state.showLabelTemplateHelp}
          onClose={this.hideLabelTemplateHelp}
        />
        <UrlTemplateFlyout
          isVisible={this.state.showUrlTemplateHelp}
          onClose={this.hideUrlTemplateHelp}
        />
        <EuiFormRow
          label={
            <FormattedMessage id="common.ui.fieldEditor.url.typeLabel" defaultMessage="Type" />
          }
        >
          <EuiSelect
            data-test-subj="urlEditorType"
            value={formatParams.type}
            options={format.type.urlTypes.map(type => {
              return {
                value: type.kind,
                text: type.text,
              };
            })}
            onChange={e => {
              this.onTypeChange(e.target.value);
            }}
          />
        </EuiFormRow>

        {formatParams.type === 'a' ? (
          <EuiFormRow
            label={
              <FormattedMessage
                id="common.ui.fieldEditor.url.openTabLabel"
                defaultMessage="Open in a new tab"
              />
            }
          >
            <EuiSwitch
              label={
                formatParams.openLinkInCurrentTab ? (
                  <FormattedMessage id="common.ui.fieldEditor.url.offLabel" defaultMessage="Off" />
                ) : (
                  <FormattedMessage id="common.ui.fieldEditor.url.onLabel" defaultMessage="On" />
                )
              }
              checked={!formatParams.openLinkInCurrentTab}
              onChange={e => {
                this.onChange({ openLinkInCurrentTab: !e.target.checked });
              }}
            />
          </EuiFormRow>
        ) : null}

        <EuiFormRow
          label={
            <FormattedMessage
              id="common.ui.fieldEditor.url.urlTemplateLabel"
              defaultMessage="URL template"
            />
          }
          helpText={
            <EuiLink onClick={this.showUrlTemplateHelp}>
              <FormattedMessage
                id="common.ui.fieldEditor.url.template.helpLinkText"
                defaultMessage="URL template help"
              />
            </EuiLink>
          }
          isInvalid={!!error}
          error={error}
        >
          <EuiFieldText
            data-test-subj="urlEditorUrlTemplate"
            value={formatParams.urlTemplate || ''}
            onChange={e => {
              this.onChange({ urlTemplate: e.target.value });
            }}
          />
        </EuiFormRow>

        <EuiFormRow
          label={
            <FormattedMessage
              id="common.ui.fieldEditor.url.labelTemplateLabel"
              defaultMessage="Label template"
            />
          }
          helpText={
            <EuiLink onClick={this.showLabelTemplateHelp}>
              <FormattedMessage
                id="common.ui.fieldEditor.url.labelTemplateHelpText"
                defaultMessage="Label template help"
              />
            </EuiLink>
          }
          isInvalid={!!error}
          error={error}
        >
          <EuiFieldText
            data-test-subj="urlEditorLabelTemplate"
            value={formatParams.labelTemplate || ''}
            onChange={e => {
              this.onChange({ labelTemplate: e.target.value });
            }}
          />
        </EuiFormRow>

        {formatParams.type === 'img' && this.renderWidthHeightParameters()}

        <FormatEditorSamples samples={samples} sampleType={sampleConverterType} />
      </Fragment>
    );
  }
}
