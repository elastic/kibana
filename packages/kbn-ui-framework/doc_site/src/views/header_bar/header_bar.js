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
          Section 1
        </h2>
      </KuiHeaderBarSection>
    </KuiHeaderBar>
  );
};
