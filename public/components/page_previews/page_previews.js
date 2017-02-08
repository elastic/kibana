import React from 'react';
import _ from 'lodash';
import { DomPreview } from 'plugins/rework/components/dom_preview/dom_preview';
import './page_previews.less';

export const PagePreviews = ({pageIds}) => {
  const previews = _.map(pageIds, id => {
    return (<DomPreview key={id} id={id}></DomPreview>);
  });

  return (<div className="rework--page-previews">{previews}</div>);
};
