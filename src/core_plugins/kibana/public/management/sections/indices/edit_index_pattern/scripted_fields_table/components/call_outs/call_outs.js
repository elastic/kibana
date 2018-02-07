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
        title="Deprecation Warning"
        color="danger"
        iconType="cross"
      >
        <p>
          We&apos;ve detected that the following deprecated languages are in use: {deprecatedLangsInUse.join(', ')}.
          Support for these languages will be removed in the next major version of Kibana and Elasticsearch.
          We recommend converting your scripted fields to <EuiLink href={painlessDocLink}>Painless</EuiLink>.
        </p>
      </EuiCallOut>
      <EuiSpacer size="m"/>
    </div>
  );
};
