import React from 'react';
import PropTypes from 'prop-types';
import { Content } from './content';
import { EuiTitle, EuiFlexItem, EuiFlexGroup, EuiSpacer, EuiImage } from '@elastic/eui';
import {
  KuiLinkButton,
} from 'ui_framework/components';

export function Introduction({ description, previewUrl, title, exportedFieldsUrl }) {
  let img;
  if (previewUrl) {
    img = (
      <EuiImage
        size="l"
        hasShadow
        allowFullScreen
        fullScreenIconColor="dark"
        alt="screenshot of primary dashboard."
        url={previewUrl}
      />
    );
  }
  let exportedFields;
  if (exportedFieldsUrl) {
    exportedFields = (
      <div>
        <EuiSpacer />
        <KuiLinkButton
          buttonType="secondary"
          href={exportedFieldsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          View exported fields
        </KuiLinkButton>
      </div>
    );
  }
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiTitle size="l">
          <h2>{title}</h2>
        </EuiTitle>
        <EuiSpacer />
        <Content text={description} />
        {exportedFields}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {img}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

Introduction.propTypes = {
  description: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  previewUrl: PropTypes.string,
  exportedFieldsUrl: PropTypes.string,
};
