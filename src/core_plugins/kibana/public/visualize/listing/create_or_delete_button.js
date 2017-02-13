import React from 'react';

import { CreateButtonLink } from 'ui_framework/components/button/create_button_link';
import { DeleteButton } from 'ui_framework/components/button/delete_button';

export function CreateOrDeleteButton({ showCreate, doDelete }) {
  if (showCreate) {
    return <CreateButtonLink
      href = "#/visualize/new"
      tooltip = "Create new visualization"
    />;
  } else {
    return <DeleteButton
      onClick={() => doDelete() }
      tooltip="Delete selected visualizations"
    />;
  }
}

CreateOrDeleteButton.propTypes = {
  showCreate: React.PropTypes.bool,
  doDelete: React.PropTypes.func
};
