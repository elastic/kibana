import React from 'react';
import { connect } from 'react-redux';
import DataframeDialog from 'plugins/rework/containers/dataframe_dialog';
import ElementAddDialog from 'plugins/rework/containers/element_add_dialog';
import WorkpadList from 'plugins/rework/components/workpad_list';
import {workpadLoad} from 'plugins/rework/state/actions/workpad';
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
  render() {
    const {dropdown} = this.props;
    const style = {
      display: 'flex',
      position: 'relative',
    };

    const dialog = (() => {
      switch (dropdown) {
        case 'dataframe':
          return (<DataframeDialog></DataframeDialog>);
        case 'element':
          return (<ElementAddDialog></ElementAddDialog>);
        case 'workpads':
          return (<WorkpadList onSelect={this.loadWorkpad}></WorkpadList>);
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
  };
}

export default connect(mapStateToProps)(DropDown);
