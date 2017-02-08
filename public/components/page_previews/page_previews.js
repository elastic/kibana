import React from 'react';
import _ from 'lodash';
import { DomPreview } from 'plugins/rework/components/dom_preview/dom_preview';
import DragSortableList from 'react-drag-sortable';
import './page_previews.less';

//const PagePreview = ({className, onClick, id}) => (
const PagePreview = ({className, onClick, id}) => (
  <div
    className={className}
    onClick={onClick}>
    <DomPreview id={id}></DomPreview>
  </div>
);

export const PagePreviews = ({pageIds, onSelect, onMove, active}) => {

  const onSort = (previewObjects) => {
    onMove(_.map(previewObjects, 'id'));
  };

  const previews = _.map(pageIds, id => {
    const classes = ['rework--page-preview'];
    if (id === active) classes.push('active');
    return {
      id: id,
      content: (
        <PagePreview key={id} id={id} className={classes.join(' ')} onClick={onSelect(id)}/>
      )
    };
  });

  return (
    <div className="rework--page-previews">
      <DragSortableList
        onSort={onSort}
        type="horizontal"
        items={previews}
        placeholder={(<div></div>)}
      />
    </div>
  );

  //return (<div className="rework--page-previews">{previews}</div>);
};
