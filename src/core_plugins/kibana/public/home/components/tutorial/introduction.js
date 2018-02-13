import React from 'react';
import PropTypes from 'prop-types';
import { Content } from './content';
import {
  EuiTitle,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
  EuiImage,
  EuiButton,
  EuiIcon,
} from '@elastic/eui';

export function Introduction({ description, previewUrl, title, exportedFieldsUrl, iconType }) {
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
        <EuiButton
          href={exportedFieldsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          View exported fields
        </EuiButton>
      </div>
    );
  }
  let icon;
  if (iconType) {
    icon = (
      <EuiIcon
        type={iconType}
        size="xl"
        style={{ marginRight: 16 }}
      />
    );
  }
  return (
    <EuiFlexGroup>

      <EuiFlexItem>
        <EuiTitle size="l">
          <h2>
            {icon}
            {title}
          </h2>
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
  iconType: PropTypes.string,
};
