import React, { Fragment } from 'react';

import {
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiSwitch,
} from '@elastic/eui';

import {
  DefaultFormatEditor
} from '../default';

import {
  FormatEditorSamples
} from '../../samples';

export class UrlFormatEditor extends DefaultFormatEditor {
  static formatId = 'url';

  constructor(props) {
    super(props);
    this.state.sampleInputsByType = {
      a: [ 'john', '/some/pathname/asset.png', 1234 ],
      img: [ 'go', 'stop', ['de', 'ne', 'us', 'ni'], 'cv' ],
      audio: [ 'hello.mp3' ],
    };
    this.state.showUrlTemplateHelp = false;
    this.state.showLabelTemplateHelp = false;
  }

  render() {
    const { format, formatParams } = this.props;
    const { error, samples } = this.state;

    return (
      <Fragment>
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
              this.onChange('type', e.target.value);
            }}
          />
        </EuiFormRow>

        {formatParams.type === 'a' ? (
          <EuiFormRow label="Open in a new tab">
            <EuiSwitch
              label={formatParams.openLinkInCurrentTab ? 'Off' : 'On'}
              checked={!formatParams.openLinkInCurrentTab}
              onChange={(e) => {
                this.onChange('openLinkInCurrentTab', !e.target.checked);
              }}
            />
          </EuiFormRow>
        ) : null}

        <EuiFormRow label="Url template">
          <EuiFieldText
            defaultValue={formatParams.urlTemplate}
            onChange={(e) => {
              this.onChange('urlTemplate', e.target.value);
            }}
          />
        </EuiFormRow>

        <EuiFormRow label="Label template">
          <EuiFieldText
            defaultValue={formatParams.labelTemplate}
            onChange={(e) => {
              this.onChange('labelTemplate', e.target.value);
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
