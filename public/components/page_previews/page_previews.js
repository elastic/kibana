import React from 'react';
import _ from 'lodash';
import { DomPreview } from 'plugins/rework/components/dom_preview/dom_preview';
import './page_previews.less';

export const PagePreviews = ({pageIds, onSelect, active}) => {
  const previews = _.map(pageIds, id => {
    const classes = ['rework--page-preview'];
    if (id === active) classes.push('active');
    return (
      <div
        key={id}
        className={classes.join(' ')}
        onClick={onSelect(id)}>
        <DomPreview id={id}></DomPreview>
      </div>
    );
  });

  return (<div className="rework--page-previews">{previews}</div>);
};
