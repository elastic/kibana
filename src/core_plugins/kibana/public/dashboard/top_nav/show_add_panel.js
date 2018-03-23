import { DashboardAddPanel } from './add_panel';
import React from 'react';
import ReactDOM from 'react-dom';

export function showAddPanel(savedObjectsClient, addNewPanel, addNewVis) {
  const container = document.createElement('div');
  const onClose = () => {
    ReactDOM.unmountComponentAtNode(container);
    document.body.removeChild(container);
  };
  const find = (type, search, page, perPage) => {
    return savedObjectsClient.find({
      type: type,
      fields: ['title'],
      search: search ? `${search}*` : undefined,
      perPage: perPage,
      page: page,
      searchFields: ['title^3', 'description']
    });
  };

  document.body.appendChild(container);
  const element = (
    <DashboardAddPanel
      onClose={onClose}
      find={find}
      addNewPanel={addNewPanel}
      addNewVis={addNewVis}
    />
  );
  ReactDOM.render(element, container);
}
