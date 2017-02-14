import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';

// Containers
import DropDown from 'plugins/rework/containers/drop_down/drop_down';
import Nav from 'plugins/rework/containers/nav/nav';
import WorkpadContainer from 'plugins/rework/containers/workpad_container/workpad_container';
<<<<<<< HEAD
import LeftSidebar from 'plugins/rework/containers/left_sidebar/left_sidebar';
=======

// Components
import LeftSidebar from 'plugins/rework/components/left_sidebar/left_sidebar';
import EditorToggle from 'plugins/rework/components/editor_toggle/editor_toggle';
>>>>>>> Pureify, break out sidebar

// Actions
import { historyRestore } from 'plugins/rework/state/actions/history';

// Styles
import './app.less';

const App = React.createClass({
  do(action) {
    const {dispatch} = this.props;
    return () => dispatch(action());
  },

  componentWillMount() {
    // listen for window popstate changes, restore state
    window.onpopstate = (ev) => {
      if (!ev) return;
      this.props.dispatch(historyRestore(ev.state));
    };
  },

  componentWillUnmount() {
    // remove window popstate listener
    window.onpopstate = null;
  },

  render() {
<<<<<<< HEAD
    if (this.props.fullscreen) {
      return (
        <WorkpadContainer></WorkpadContainer>
      );
    } else {
      return (
        <div className="rework--application">
          <Nav></Nav>
          <DropDown></DropDown>
          <div className="rework--workspace">
            <LeftSidebar></LeftSidebar>
            <WorkpadContainer></WorkpadContainer>
          </div>
=======
    const  {elements, editor, selectedElement, fullscreen} = this.props;
    const {resizeMove, rotate, select} = this;
    const currentElement = elements[selectedElement];

    const workpadContainerElem = (<WorkpadContainer></WorkpadContainer>);


    // TODO: This entire thing can be broken up into smaller containers.
    // But for now, its actually *more* readable this way.
    if (fullscreen) return workpadContainerElem;

    return (
      <div className="rework--application">
        <Nav></Nav>
        <DropDown></DropDown>

        <div className="rework--workspace">

          <LeftSidebar
            isOpen={editor}
            toggle={this.do(editorToggle)}
            argumentSet={this.argumentSet}
            openElementDropDown={this.openElementDropDown}
            element={currentElement}>
          </LeftSidebar>

          {workpadContainerElem}

>>>>>>> Pureify, break out sidebar
        </div>
      );
    }
  }
});

function mapStateToProps(state) {
  return {
    fullscreen: state.transient.fullscreen,
  };
}

export default connect(mapStateToProps)(App);
