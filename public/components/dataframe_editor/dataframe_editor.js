import React from 'react';
import _ from 'lodash';
import frameSources from 'plugins/rework/arg_types/dataframe/frame_sources/frame_sources';

export default React.createClass({
  componentWillReceiveProps(nextProps) {
    console.log('editor', nextProps.dataframe.value);
  },
  render() {
    const {dataframe, commit} = this.props;

    const DataframeForm = frameSources.byName[dataframe.type].form;
    return (
      <div className="rework--dataframe-editor">
        <DataframeForm key={dataframe.id} value={dataframe.value} commit={commit}></DataframeForm>
      </div>
    );
  }
});
