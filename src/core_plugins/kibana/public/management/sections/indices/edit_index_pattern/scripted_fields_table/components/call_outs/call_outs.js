import React from 'react';

import {
  EuiCallOut,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';

export const CallOuts = ({
  deprecatedLangsInUse,
  painlessDocLink,
}) => {
  if (!deprecatedLangsInUse.length) {
    return null;
  }

  return (
    <div>
      <EuiCallOut
        title="Deprecation languages in use"
        color="danger"
        iconType="cross"
      >
        <p>
          The following deprecated languages are in use: {deprecatedLangsInUse.join(', ')}.
          Support for these languages will be removed in the next major version of Kibana
          and Elasticsearch. Convert you scripted fields to <EuiLink href={painlessDocLink}>Painless</EuiLink> to avoid any problems.
        </p>
      </EuiCallOut>
      <EuiSpacer size="m"/>
    </div>
  );
};
