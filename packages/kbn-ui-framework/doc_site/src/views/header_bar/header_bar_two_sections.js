import React from 'react';

import {
  KuiHeaderBar,
  KuiHeaderBarSection
} from '../../../../components';

export default () => {
  return (
    <KuiHeaderBar>
      <KuiHeaderBarSection>
        <h2 className="kuiSubTitle">
          Cluster Alerts
        </h2>
      </KuiHeaderBarSection>

      <KuiHeaderBarSection>
        <span className="kuiText">
          <span className="kuiStatusText kuiStatusText--error">
            <span className="kuiStatusText__icon kuiIcon fa-warning" aria-label="Warning" role="img"/>
            Red health
          </span>
        </span>
      </KuiHeaderBarSection>
    </KuiHeaderBar>
  );
};
