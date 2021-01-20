/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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

import { FormattedMessage } from '@kbn/i18n/react';
import { DefaultFormatEditor, FormatEditorProps } from '../default';

import { FormatEditorSamples } from '../../samples';

import { LabelTemplateFlyout } from './label_template_flyout';

import { UrlTemplateFlyout } from './url_template_flyout';
import type { IndexPatternManagmentContextValue } from '../../../../../../types';
import { context as contextType } from '../../../../../../../../kibana_react/public';

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
  static formatId = 'url';
  // TODO: @kbn/optimizer can't compile this
  // declare context: IndexPatternManagmentContextValue;
  context: IndexPatternManagmentContextValue | undefined;
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
            <FormattedMessage id="indexPatternManagement.url.widthLabel" defaultMessage="Width" />
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
            <FormattedMessage id="indexPatternManagement.url.heightLabel" defaultMessage="Height" />
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
            <FormattedMessage id="indexPatternManagement.url.typeLabel" defaultMessage="Type" />
          }
        >
          <EuiSelect
            data-test-subj="urlEditorType"
            value={formatParams.type}
            options={format.type.urlTypes.map((type: UrlType) => {
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
          <EuiFormRow
            label={
              <FormattedMessage
                id="indexPatternManagement.url.openTabLabel"
                defaultMessage="Open in a new tab"
              />
            }
          >
            <EuiSwitch
              label={
                formatParams.openLinkInCurrentTab ? (
                  <FormattedMessage id="indexPatternManagement.url.offLabel" defaultMessage="Off" />
                ) : (
                  <FormattedMessage id="indexPatternManagement.url.onLabel" defaultMessage="On" />
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
              id="indexPatternManagement.url.urlTemplateLabel"
              defaultMessage="URL template"
            />
          }
          helpText={
            <EuiLink onClick={this.showUrlTemplateHelp}>
              <FormattedMessage
                id="indexPatternManagement.url.template.helpLinkText"
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
              id="indexPatternManagement.url.labelTemplateLabel"
              defaultMessage="Label template"
            />
          }
          helpText={
            <EuiLink onClick={this.showLabelTemplateHelp}>
              <FormattedMessage
                id="indexPatternManagement.url.labelTemplateHelpText"
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

        {formatParams.type === 'img' && this.renderWidthHeightParameters()}

        <FormatEditorSamples samples={samples} sampleType={sampleConverterType} />
      </Fragment>
    );
  }
}
