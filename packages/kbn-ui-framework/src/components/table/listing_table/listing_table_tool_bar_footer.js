import React from 'react';
import PropTypes from 'prop-types';

import {
  KuiToolBarFooter,
  KuiToolBarText,
  KuiToolBarFooterSection,
} from '../../';



export function KuiListingTableToolBarFooter({ pager, itemsSelectedCount }) {
  const renderText = () => {
    if (itemsSelectedCount === 1) {
      return '1 item selected';
    }

    return `${itemsSelectedCount} items selected`;
  };

  let pagerSection;

  if (pager) {
    pagerSection = (
      <KuiToolBarFooterSection>
        {pager}
      </KuiToolBarFooterSection>
    );
  }

  return (
    <KuiToolBarFooter>
      <KuiToolBarFooterSection>
        <KuiToolBarText>
          {renderText()}
        </KuiToolBarText>
      </KuiToolBarFooterSection>

      {pagerSection}
    </KuiToolBarFooter>
  );
}

KuiListingTableToolBarFooter.propTypes = {
  pager: PropTypes.node,
  itemsSelectedCount: PropTypes.number,
};
