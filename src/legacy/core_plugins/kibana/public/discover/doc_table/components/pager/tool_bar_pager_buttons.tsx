import React from 'react';

interface Props {
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPageNext: () => void;
  onPagePrevious: () => void;
}

export function ToolBarPagerButtons(props: Props) {
  return (
    <div className="kuiButtonGroup">
      <button
        className="kuiButton kuiButton--basic kuiButton--icon"
        onClick={() => props.onPagePrevious()}
        disabled={!props.hasPreviousPage}
        data-test-subj="btnPrevPage"
      >
        <span className="kuiButton__icon kuiIcon fa-chevron-left"></span>
      </button>
      <button
        className="kuiButton kuiButton--basic kuiButton--icon"
        onClick={() => props.onPageNext()}
        disabled={!props.hasNextPage}
        data-test-subj="btnNextPage"
      >
        <span className="kuiButton__icon kuiIcon fa-chevron-right"></span>
      </button>
    </div>
  );
}
