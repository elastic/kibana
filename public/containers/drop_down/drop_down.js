import React from 'react';
import classnames from 'classnames';
import { connect } from 'react-redux';

import DataframeDialog from 'plugins/rework/containers/dataframe_dialog';
import ElementAddDialog from 'plugins/rework/containers/element_add_dialog';
import WorkpadList from 'plugins/rework/components/workpad_list';
import { workpadLoad, workpadProps } from 'plugins/rework/state/actions/workpad';
import { pageSetById, pageSetOrder } from 'plugins/rework/state/actions/page';
import { dataframeResolveAll } from 'plugins/rework/state/actions/dataframe';
import Timepicker from 'plugins/rework/components/timepicker/timepicker';
import { PagePreviews } from 'plugins/rework/components/page_previews/page_previews';

import './drop_down.less';

const DropDown = React.createClass({
  loadWorkpad(id) {
    this.props.dispatch(workpadLoad(id));
  },

  updateTime(time) {
    const {dispatch} = this.props;
    dispatch(workpadProps({time}));
    dispatch(dataframeResolveAll());
  },
  selectPage(id) {
    return () => this.props.dispatch(pageSetById(id));
  },
  setPageOrder(pageIds) {
    this.props.dispatch(pageSetOrder(pageIds));
  },
  render() {
    const {dropdown, time, pageIds, currentPageId} = this.props;
    const style = {
      display: 'flex',
      position: 'relative',
    };

    const timeAppObj = {
      timefilter: time
    };

    const pickDialog = () => {
      switch (dropdown.type) {
        case 'dataframe':
          return (<DataframeDialog meta={dropdown.meta}></DataframeDialog>);
        case 'element':
          return (<ElementAddDialog></ElementAddDialog>);
        case 'workpads':
          return (<WorkpadList onSelect={this.loadWorkpad}></WorkpadList>);
        case 'timepicker':
          return (<Timepicker time={time} onChange={this.updateTime}></Timepicker>);
        case 'previews':
          return (
            <PagePreviews
              onSelect={this.selectPage}
              onMove={this.setPageOrder}
              pageIds={pageIds}
              active={currentPageId}>
            </PagePreviews>
          );
        default:
          return null;
      }
    };

    const dialog = pickDialog();

    const content = !dialog ? null : (
      <div className="rework--dropdown" style={style}>
        {dialog}
      </div>
    );

    return (content);
  }
});

function mapStateToProps(state) {
  return {
    dropdown: state.transient.dropdown,
    time: state.persistent.workpad.time,
    pageIds: state.persistent.workpad.pages,
    currentPageId: state.persistent.workpad.pages[state.persistent.workpad.page]
  };
}

export default connect(mapStateToProps)(DropDown);
