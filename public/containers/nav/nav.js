import React from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import TopNav from 'plugins/rework/components/top_nav/top_nav';
import NavButton from 'plugins/rework/components/nav_button/nav_button';
import Editable from 'plugins/rework/components/editable/editable';
import { workpadName, workpadNew } from 'plugins/rework/state/actions/workpad';
import { dropdownToggle } from 'plugins/rework/state/actions/misc';


const DataframeDialog = React.createClass({
  nameWorkpad(value) {
    this.props.dispatch(workpadName(value));
  },
  newWorkpad() {
    this.props.dispatch(workpadNew());
  },
  dropdown(name) {
    return () => {
      this.props.dispatch(dropdownToggle(name));
    };
  },
  render() {
    const {workpad} = this.props;

    return (
      <TopNav>
        <div className="rework--top-nav-top">
          <Editable className="rework--workpad-name" onChange={this.nameWorkpad} value={workpad.name}></Editable>
        </div>
        <div className="rework--top-nav-bottom">
          <NavButton
            tooltip="Dataframes"
            className="fa fa-database"
            onClick={this.dropdown('dataframe')}></NavButton>
          <NavButton
            tooltip="Add Element"
            className="fa fa-plus-circle"
            onClick={this.dropdown('element')}></NavButton>
          <NavButton
            tooltip="New Workpad"
            className="fa fa-star"
            onClick={this.newWorkpad}></NavButton>

        </div>
      </TopNav>
    );
  }
});

function mapStateToProps(state) {
  return {
    workpad: state.persistent.workpad,
  };
}

export default connect(mapStateToProps)(DataframeDialog);
