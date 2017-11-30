export class KibanaIndexPatch {
  constructor(options) {
    this.log = options.log;
    this.indexName = options.indexName;
    this.kibanaIndexMappingsDsl = options.kibanaIndexMappingsDsl;
    this.currentMappingsDsl = options.currentMappingsDsl;
    this.rootEsType = options.rootEsType;
    this.callCluster = options.callCluster;
  }

  async applyPatch() {
    const patchMappings = await this.getUpdatedPatchMappings();
    if (!patchMappings) {
      return;
    }

    try {
      await this.putMappings(patchMappings);
    }
    catch (e) {
      this.log(['error', 'elasticsearch'], {
        tmpl: `Unable to patch mappings for "<%= cls %>"`,
        cls: this.constructor.name,
      });
      return;
    }

    try {
      await this.applyChanges(patchMappings);
    }
    catch (e) {
      this.log(['error', 'elasticsearch'], {
        tmpl: `Unable to apply patch changes for "<%= cls %>"`,
        cls: this.constructor.name,
      });
    }
  }

  getUpdatedPatchMappings() {}
  applyChanges() {}

  async putMappings(patchMappings) {
    // log about new properties
    this.log(['info', 'elasticsearch'], {
      tmpl: `Adding mappings to kibana index for SavedObject types "<%= names.join('", "') %>"`,
      names: Object.keys(patchMappings),
    });

    // add the new properties to the index mapping
    await this.callCluster('indices.putMapping', {
      index: this.indexName,
      type: this.rootEsType,
      body: {
        properties: patchMappings,
      },
      update_all_types: true
    });
  }
}
