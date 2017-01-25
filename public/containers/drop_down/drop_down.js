import React from 'react';
import { connect } from 'react-redux';
import DataframeDialog from 'plugins/rework/containers/dataframe_dialog';
import ElementAddDialog from 'plugins/rework/containers/element_add_dialog';
import WorkpadList from 'plugins/rework/components/workpad_list';
import {workpadLoad, workpadTime} from 'plugins/rework/state/actions/workpad';
import {dataframeResolveAll} from 'plugins/rework/state/actions/dataframe';
import Timepicker from 'plugins/rework/components/timepicker/timepicker';
import './drop_down.less';
import classnames from 'classnames';
import fetch from 'isomorphic-fetch';


const DropDown = React.createClass({
  loadWorkpad(id) {
    const {dispatch} = this.props;
    fetch('../api/rework/get/' + id, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'kbn-xsrf': 'turdSandwich',
      }
    })
    .then(resp => resp.json()).then(resp => {
      console.log(resp);
      dispatch(workpadLoad(resp.resp._source));
    });
  },
  updateTime(time) {
    const {dispatch} = this.props;
    dispatch(workpadTime(time));
    dispatch(dataframeResolveAll());
  },
  render() {
    const {dropdown, time} = this.props;
    const style = {
      display: 'flex',
      position: 'relative',
    };

    const timeAppObj = {
      timefilter: time
    };

    const dialog = (() => {
      switch (dropdown) {
        case 'dataframe':
          return (<DataframeDialog></DataframeDialog>);
        case 'element':
          return (<ElementAddDialog></ElementAddDialog>);
        case 'workpads':
          return (<WorkpadList onSelect={this.loadWorkpad}></WorkpadList>);
        case 'timepicker':
          return (<Timepicker time={time} onChange={this.updateTime}></Timepicker>);
        default:
          return null;
      }
    }());

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
  };
}

export default connect(mapStateToProps)(DropDown);
