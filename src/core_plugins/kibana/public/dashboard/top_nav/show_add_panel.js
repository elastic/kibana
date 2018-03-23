import { DashboardAddPanel } from './add_panel';
import React from 'react';
import ReactDOM from 'react-dom';

let isOpen = false;

export function showAddPanel(savedObjectsClient, addNewPanel, addNewVis) {
  if (isOpen) {
    return;
  }

  isOpen = true;
  const container = document.createElement('div');
  const onClose = () => {
    ReactDOM.unmountComponentAtNode(container);
    document.body.removeChild(container);
    isOpen = false;
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
  const addNewVisWithCleanup = () => {
    onClose();
    addNewVis();
  };

  document.body.appendChild(container);
  const element = (
    <DashboardAddPanel
      onClose={onClose}
      find={find}
      addNewPanel={addNewPanel}
      addNewVis={addNewVisWithCleanup}
    />
  );
  ReactDOM.render(element, container);
}
