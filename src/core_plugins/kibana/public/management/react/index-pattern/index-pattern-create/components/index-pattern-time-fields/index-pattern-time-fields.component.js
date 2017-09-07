import React from 'react';
import {
  KuiSelect,
  KuiButtonEmpty,
  KuiFlexGroup,
  KuiFlexItem,
} from 'ui_framework/components';

const IndexPatternTimeFields = ({
  timeFields,
  selectTimeField,
  fetchTimeFields,
}) => {
  if (timeFields === undefined) {
    return null;
  }

  return (
    <KuiFlexGroup>
      <KuiFlexItem>
        <KuiSelect
          placeholder="Specify an optional time field"
          options={timeFields}
          onChange={(e) => selectTimeField(e.target.value)}
        />
      </KuiFlexItem>
      <KuiFlexItem grow={false}>
        <KuiButtonEmpty
          iconType="lock"
          onClick={() => fetchTimeFields(pattern)}
        />
      </KuiFlexItem>
    </KuiFlexGroup>
  );
}

export default IndexPatternTimeFields;
