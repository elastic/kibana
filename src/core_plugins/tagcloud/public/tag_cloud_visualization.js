import TagCloud from 'plugins/tagcloud/tag_cloud';
import AggConfigResult from 'ui/vis/agg_config_result';
import {Observable} from 'rxjs';

const MAX_TAG_COUNT = 200;

export class TagCloudVisualization {

  constructor(node, vis) {
    this._containerNode = node;

    const nodeContens = document.createElement('div');
    nodeContens.innerHTML = `
            <div class="tagcloud-vis">
              <div class="tagcloud-custom-label"></div>
              <div class="tagcloud-notifications">
                  <div class="tagcloud-truncated-message">
                    The number of tags has been truncated to avoid long draw times.
                  </div>
                  <div class="tagcloud-incomplete-message">
                    The container is too small to display the entire cloud. Tags might be cropped or omitted.
                  </div>
              </div>
            </div>
          `;

    this._containerNode.appendChild(nodeContens);

    this._vis = vis;
    this._bucketAgg = null;
    this._truncated = false;
    this._tagCloud = new TagCloud(node);
    this._tagCloud.on('select', (event) => {
      if (!this._bucketAgg) {
        return;
      }
      const filter = bucketAgg.createFilter(event);
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

    if (!this._vis.aggs[0] || !this._vis.aggs[1]) {
      incompleteMessage.style.display = 'none';
      truncatedMessage.style.display = 'none';
      return;
    }

    const bucketName = this._containerNode.querySelector('.tagcloud-custom-label');
    bucketName.innerHTML = `${this._vis.aggs[0].makeLabel()} - ${this._vis.aggs[1].makeLabel()}`;
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
    this._bucketAgg = data.columns[0].aggConfig;

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
