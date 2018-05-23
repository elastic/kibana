import React from 'react';

import {
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';

export const ScriptingDisabledCallOut = ({
  isVisible = false,
}) => {
  return isVisible ? (
    <div>
      <EuiCallOut
        title="Scripting disabled"
        color="danger"
        iconType="alert"
      >
        <p>
          All inline scripting has been disabled in Elasticsearch. You must enable inline
          scripting for at least one language in order to use scripted fields in Kibana.
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </div>
  ) : null;
};
