/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

import { FormattedMessage } from '@kbn/i18n-react';
import { DefaultFormatEditor } from '../default/default';

import { FormatEditorSamples } from '../../samples';
import { formatId } from './constants';

import { context as contextType } from '../../../../../../kibana_react/public';
import { FormatEditorProps } from '../types';
import { UrlFormat } from '../../../../../../field_formats/common';

interface OnChangeParam {
  type: string;
  width?: string;
  height?: string;
  urlTemplate?: string;
}

interface UrlFormatEditorFormatParams {
  openLinkInCurrentTab: boolean;
  urlTemplate: string;
  labelTemplate: string;
  width: string;
  height: string;
}

interface UrlFormatEditorFormatState {
  showLabelTemplateHelp: boolean;
  showUrlTemplateHelp: boolean;
}

interface UrlType {
  kind: string;
  text: string;
}

export class UrlFormatEditor extends DefaultFormatEditor<
  UrlFormatEditorFormatParams,
  UrlFormatEditorFormatState
> {
  static contextType = contextType;
  static formatId = formatId;
  private get sampleIconPath() {
    const sampleIconPath = `/plugins/indexPatternManagement/assets/icons/{{value}}.png`;
    return this.context?.services.http
      ? this.context.services.http.basePath.prepend(sampleIconPath)
      : sampleIconPath;
  }

  constructor(props: FormatEditorProps<UrlFormatEditorFormatParams>) {
    super(props);

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

  sanitizeNumericValue = (val: string) => {
    const sanitizedValue = parseInt(val, 10);
    if (isNaN(sanitizedValue)) {
      return '';
    }
    return sanitizedValue;
  };

  onTypeChange = (newType: string) => {
    const { urlTemplate, width, height } = this.props.formatParams;
    const params: OnChangeParam = {
      type: newType,
    };
    if (newType === 'img') {
      params.width = width;
      params.height = height;
      if (!urlTemplate) {
        params.urlTemplate = this.sampleIconPath;
      }
    } else if (newType !== 'img' && urlTemplate === this.sampleIconPath) {
      params.urlTemplate = undefined;
    }
    this.onChange(params);
  };

  renderWidthHeightParameters = () => {
    const width = this.sanitizeNumericValue(this.props.formatParams.width);
    const height = this.sanitizeNumericValue(this.props.formatParams.height);
    return (
      <Fragment>
        <EuiFormRow
          label={
            <FormattedMessage id="indexPatternFieldEditor.url.widthLabel" defaultMessage="Width" />
          }
        >
          <EuiFieldNumber
            data-test-subj="urlEditorWidth"
            value={width}
            onChange={(e) => {
              this.onChange({ width: e.target.value });
            }}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage
              id="indexPatternFieldEditor.url.heightLabel"
              defaultMessage="Height"
            />
          }
        >
          <EuiFieldNumber
            data-test-subj="urlEditorHeight"
            value={height}
            onChange={(e) => {
              this.onChange({ height: e.target.value });
            }}
          />
        </EuiFormRow>
      </Fragment>
    );
  };

  render() {
    const { formatParams, format } = this.props;
    const { error, samples, sampleConverterType } = this.state;

    const urlType = formatParams.type ?? format.getParamDefaults().type;
    return (
      <Fragment>
        <EuiFormRow
          label={
            <FormattedMessage id="indexPatternFieldEditor.url.typeLabel" defaultMessage="Type" />
          }
        >
          <EuiSelect
            data-test-subj="urlEditorType"
            value={urlType}
            options={(format.type as typeof UrlFormat).urlTypes.map((type: UrlType) => {
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

        {urlType === 'a' ? (
          <EuiFormRow
            label={
              <FormattedMessage
                id="indexPatternFieldEditor.url.openTabLabel"
                defaultMessage="Open in a new tab"
              />
            }
          >
            <EuiSwitch
              label={
                formatParams.openLinkInCurrentTab ? (
                  <FormattedMessage
                    id="indexPatternFieldEditor.url.offLabel"
                    defaultMessage="Off"
                  />
                ) : (
                  <FormattedMessage id="indexPatternFieldEditor.url.onLabel" defaultMessage="On" />
                )
              }
              checked={!formatParams.openLinkInCurrentTab}
              onChange={(e) => {
                this.onChange({ openLinkInCurrentTab: !e.target.checked });
              }}
            />
          </EuiFormRow>
        ) : null}

        <EuiFormRow
          label={
            <FormattedMessage
              id="indexPatternFieldEditor.url.urlTemplateLabel"
              defaultMessage="URL template"
            />
          }
          helpText={
            <EuiLink
              target="_blank"
              href={this.context.services.docLinks.links.indexPatterns.fieldFormattersString}
            >
              <FormattedMessage
                id="indexPatternFieldEditor.url.template.helpLinkText"
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
            onChange={(e) => {
              this.onChange({ urlTemplate: e.target.value });
            }}
          />
        </EuiFormRow>

        <EuiFormRow
          label={
            <FormattedMessage
              id="indexPatternFieldEditor.url.labelTemplateLabel"
              defaultMessage="Label template"
            />
          }
          helpText={
            <EuiLink
              target="_blank"
              href={this.context.services.docLinks.links.indexPatterns.fieldFormattersString}
            >
              <FormattedMessage
                id="indexPatternFieldEditor.url.labelTemplateHelpText"
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
            onChange={(e) => {
              this.onChange({ labelTemplate: e.target.value });
            }}
          />
        </EuiFormRow>

        {urlType === 'img' && this.renderWidthHeightParameters()}

        <FormatEditorSamples samples={samples} sampleType={sampleConverterType} />
      </Fragment>
    );
  }
}
