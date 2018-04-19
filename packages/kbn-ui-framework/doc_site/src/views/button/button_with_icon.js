import React from 'react';

import {
  KuiButton,
  KuiButtonIcon,
} from '../../../../components';

export default () => (
  <div>
    <KuiButton
      buttonType="primary"
      icon={<KuiButtonIcon type="create" />}
    >
      Create
    </KuiButton>

    <br />
    <br />

    <KuiButton
      buttonType="danger"
      icon={<KuiButtonIcon type="delete" />}
    >
      Delete
    </KuiButton>

    <br />
    <br />

    <KuiButton
      buttonType="basic"
      icon={<KuiButtonIcon type="previous" />}
    >
      Previous
    </KuiButton>

    <br />
    <br />

    <KuiButton
      buttonType="basic"
      icon={<KuiButtonIcon type="next" />}
      iconPosition="right"
    >
      Next
    </KuiButton>

    <br />
    <br />

    <KuiButton
      buttonType="basic"
      icon={<KuiButtonIcon type="loading" />}
    >
      Loading
    </KuiButton>

    <br />
    <br />

    <KuiButton
      buttonType="basic"
      aria-label="Book flight"
      icon={<KuiButtonIcon className="fa-plane" />}
    />
  </div>
);
