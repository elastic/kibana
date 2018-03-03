import TagCloud from 'plugins/tagcloud/tag_cloud';
import React, { Component } from 'react';

export class TagCloudVisualization extends Component {

  _renderTagCloud(props) {
    if (props.updateStatus.resize) {
      this.tagCloud.resize();
    }

    if (props.updateStatus.params) {
      this.tagCloud.setOptions(props.vis.params);
    }

    if (!props.updateStatus.data) return;

    if (!props.visData || !props.visData.tables.length) {
      this.tagCloud.setData([]);
      return;
    }

    const data = props.visData.tables[0];
    this.bucketAgg = data.columns[0].aggConfig;

    const tags = data.rows.map(row => {
      const [tag, count] = row;
      return {
        displayText: this.bucketAgg ? this.bucketAgg.fieldFormatter()(tag) : tag,
        rawText: tag,
        value: count
      };
    });

    this.tagCloud.setData(tags);
  }

  render() {
    const { vis } = this.props;
    return (
      <div className="tagcloud-vis" ref={el => this.containerDiv = el}>
        { !vis.params.hideLabel &&
          <div className="tagcloud-custom-label">
            {vis.aggs[0].makeLabel()} - {vis.aggs[1].makeLabel()}
          </div>
        }
      </div>
    );
  }

  componentDidMount() {
    this.tagCloud = new TagCloud(this.containerDiv);

    this.tagCloud.on('select', (event) => {
      if (!this.bucketAgg) return;
      const filter = this.bucketAgg.createFilter(event);
      this.props.vis.API.queryFilter.addFilters(filter);
    });

    this.tagCloud.on('renderComplete', this.props.renderComplete);

    this._renderTagCloud(this.props);
  }

  componentDidUpdate() {
    this._renderTagCloud(this.props);
  }

  componentWillUnmount() {
    this.tagCloud.destroy();
  }
}
