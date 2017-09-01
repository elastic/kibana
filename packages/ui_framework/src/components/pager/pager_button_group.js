import PropTypes from 'prop-types';
import React from 'react';

import { KuiButton, KuiButtonIcon, KuiButtonGroup } from '../button';

export function KuiPagerButtonGroup({ className, onPrevious, onNext, hasNext, hasPrevious, ...rest }) {
  return (
    <KuiButtonGroup isUnited className={className} {...rest}>
      <KuiButton
        aria-label="Show previous page"
        data-test-subj="pagerPreviousButton"
        buttonType="basic"
        onClick={onPrevious}
        disabled={!hasPrevious}
        icon={<KuiButtonIcon type="previous" />}
      />
      <KuiButton
        aria-label="Show next page"
        data-test-subj="pagerNextButton"
        buttonType="basic"
        onClick={onNext}
        disabled={!hasNext}
        icon={<KuiButtonIcon type="next" />}
      />
    </KuiButtonGroup>
  );
}

KuiPagerButtonGroup.propTypes = {
  onPrevious: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  hasNext: PropTypes.bool.isRequired,
  hasPrevious: PropTypes.bool.isRequired,
  className: PropTypes.string
};
