import React from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import TopNav from 'plugins/rework/components/top_nav/top_nav';
import NavButton from 'plugins/rework/components/nav_button/nav_button';
import Editable from 'plugins/rework/components/editable/editable';
import { workpadProps, workpadNew } from 'plugins/rework/state/actions/workpad';
import { elementLayerMove } from 'plugins/rework/state/actions/element';
import { dropdownToggle } from 'plugins/rework/state/actions/misc';
import { fullscreenToggle } from 'plugins/rework/state/actions/misc';
import { Timepicker } from '@elastic/kbn-react-ui';

import '@elastic/kbn-react-ui/css/main.css';
import './nav.less';


const DataframeDialog = React.createClass({
  nameWorkpad(name) {
    this.props.dispatch(workpadProps({name}));
  },
  newWorkpad() {
    this.props.dispatch(workpadNew());
  },
  dropdown(name) {
    return () => {
      this.props.dispatch(dropdownToggle(name));
    };
  },
  elementLayer(movement) {
    return () => {
      const {dispatch, selectedElementId, currentPageId} = this.props;
      this.props.dispatch(elementLayerMove(selectedElementId, currentPageId, movement));
    };
  },
  do(action) {
    return () => this.props.dispatch(action());
  },
  render() {
    const {workpad, selectedElementId, currentPageId, time} = this.props;
    const layerClasses = ['rework--nav--layer-buttons'];
    if (!selectedElementId) layerClasses.push('rework--nav--layer-buttons-disabled');

    return (
      <TopNav>
        <div className="rework--top-nav-top">
          <Editable className="rework--workpad-name" onChange={this.nameWorkpad} value={workpad.name}></Editable>
          <Timepicker
            refresh={_.noop}
            timefilter={time}
            onPause={_.noop}
            onPickerClick={this.dropdown('timepicker')}
          />
        </div>
        <div className="rework--top-nav-bottom">
          <NavButton
            tooltip="Present"
            className="fa fa-play"
            onClick={this.do(fullscreenToggle)}></NavButton>

          <vhr/>

          <NavButton
            tooltip="Dataframes"
            className="fa fa-database"
            onClick={this.dropdown('dataframe')}></NavButton>
          <NavButton
            tooltip="Add Element"
            className="fa fa-plus-circle"
            onClick={this.dropdown('element')}></NavButton>
          <NavButton
            tooltip="Open Workpad"
            className="fa fa-folder-open"
            onClick={this.dropdown('workpads')}></NavButton>
          <NavButton
            tooltip="New Workpad"
            className="fa fa-star"
            onClick={this.newWorkpad}></NavButton>

          <vhr/>


          <div className={layerClasses.join(' ')}>
            <NavButton
              tooltip="Move to top"
              className="fa fa-angle-double-up"
              onClick={this.elementLayer('++')}></NavButton>
            <NavButton
              tooltip="Move up"
              className="fa fa-angle-up"
              onClick={this.elementLayer('+')}></NavButton>
            <NavButton
              tooltip="Move Down"
              className="fa fa-angle-down"
              onClick={this.elementLayer('-')}></NavButton>
            <NavButton
              tooltip="Move to bottom"
              className="fa fa-angle-double-down"
              onClick={this.elementLayer('--')}></NavButton>
          </div>

        </div>
      </TopNav>
    );
  }
});

function mapStateToProps(state) {
  const {workpad} = state.persistent;
  return {
    workpad: workpad,
    time: workpad.time,
    selectedElementId: state.transient.selectedElement,
    currentPageId: workpad.pages[workpad.page]
  };
}

export default connect(mapStateToProps)(DataframeDialog);
