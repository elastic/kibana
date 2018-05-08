import React from 'react';

function NoDataComponent() {
  return (
    <div className="metrics_issue" data-test-subj="noTSVBDataMessage">
      <div className="metrics_issue__title">No data to display for the selected metrics .</div>
    </div>
  );
}
export default NoDataComponent;
