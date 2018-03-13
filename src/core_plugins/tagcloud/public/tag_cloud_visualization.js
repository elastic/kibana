import TagCloud from './tag_cloud';
import tagCloudContainer from './tag_cloud_container.html';
import { Observable } from 'rxjs';

const MAX_TAG_COUNT = 200;

export class TagCloudVisualization {

  constructor(node, vis) {
    this._containerNode = node;

    const nodeContents = document.createElement('div');
    nodeContents.innerHTML = tagCloudContainer;
    this._containerNode.appendChild(nodeContents);

    this._vis = vis;
    this._bucketAgg = null;
    this._truncated = false;
    const cloudContainer = this._containerNode.querySelector('.tagcloud-vis');
    this._tagCloud = new TagCloud(cloudContainer);
    this._tagCloud.on('select', (event) => {
      if (!this._bucketAgg) {
        return;
      }
      const filter = this._bucketAgg.createFilter(event);
      this._vis.API.queryFilter.addFilters(filter);
    });
    this._renderComplete$ = Observable.fromEvent(this._tagCloud, 'renderComplete');

  }

  async render(data, status) {


    if (status.params || status.aggs) {
      this._updateParams();
    }

    if (status.data) {
      this._updateData(data);
    }


    if (status.resize) {
      this._resize();
    }

    await this._renderComplete$.take(1).toPromise();

    const truncatedMessage = this._containerNode.querySelector('.tagcloud-truncated-message');
    const incompleteMessage = this._containerNode.querySelector('.tagcloud-incomplete-message');

    const hasAggDefined = this._vis.aggs[0] && this._vis.aggs[1];
    if (!hasAggDefined) {
      incompleteMessage.style.display = 'none';
      truncatedMessage.style.display = 'none';
      return;
    }

    const bucketName = this._containerNode.querySelector('.tagcloud-custom-label');
    bucketName.textContent = `${this._vis.aggs[0].makeLabel()} - ${this._vis.aggs[1].makeLabel()}`;
    truncatedMessage.style.display = this._truncated ? 'block' : 'none';

    const tagCloudStatus = this._tagCloud.getStatus();
    if (TagCloud.STATUS.COMPLETE === tagCloudStatus) {
      incompleteMessage.style.display = 'none';
    } else if (TagCloud.STATUS.INCOMPLETE === tagCloudStatus) {
      incompleteMessage.style.display = 'block';
    }

    if (this._vis.params.showLabel) {
      bucketName.style.display = 'block';
    } else {
      bucketName.style.display = 'none';
    }
  }


  destroy() {
    this._tagCloud.destroy();
  }

  _updateData(response) {
    if (!response || !response.tables.length) {
      this._tagCloud.setData([]);
      return;
    }

    const data = response.tables[0];
    this._bucketAgg = this._vis.aggs.find(agg => agg.type.name === 'terms');

    const tags = data.rows.map(row => {
      const [tag, count] = row;
      return {
        displayText: this._bucketAgg ? this._bucketAgg.fieldFormatter()(tag) : tag,
        rawText: tag,
        value: count
      };
    });


    if (tags.length > MAX_TAG_COUNT) {
      tags.length = MAX_TAG_COUNT;
      this._truncated = true;
    } else {
      this._truncated = false;
    }

    this._tagCloud.setData(tags);

  }

  _updateParams() {
    this._tagCloud.setOptions(this._vis.params);
  }

  _resize() {
    this._tagCloud.resize();
  }

}
