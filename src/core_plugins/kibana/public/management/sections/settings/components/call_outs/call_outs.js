import React from 'react';

import {
  EuiCallOut,
} from '@elastic/eui';

export const CallOuts = () => {
  return (
    <div>
      <EuiCallOut
        title="Caution: You can break stuff here"
        color="warning"
        iconType="bolt"
      >
        <p>
          Be careful in here, these settings are for very advanced users only.
          Tweaks you make here can break large portions of Kibana.
          Some of these settings may be undocumented, unsupported or experimental.
          If a field has a default value, blanking the field will reset it to its default which may be
          unacceptable given other configuration directives.
          Deleting a custom setting will permanently remove it from Kibana&apos;s config.
        </p>
      </EuiCallOut>
    </div>
  );
};
