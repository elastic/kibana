import React from 'react';
import _ from 'lodash';
import frameSources from 'plugins/rework/arg_types/dataframe/frame_sources/frame_sources';

export default React.createClass({
  commit(value) {
    return (prop) => {
      console.log(prop, value);
    };
  },
  render() {
    const {dataframe} = this.props;

    const DataframeForm = frameSources.byName[dataframe.type].form;
    return (
      <div className="rework--dataframe-editor">
        <DataframeForm value={dataframe.value} commit={this.commit}></DataframeForm>
      </div>
    );
  }
});
