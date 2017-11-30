export class KibanaIndexChange {
  constructor(options) {
    this.log = options.log;
    this.indexName = options.indexName;
    this.kibanaIndexMappingsDsl = options.kibanaIndexMappingsDsl;
    this.currentMappingsDsl = options.currentMappingsDsl;
    this.rootEsType = options.rootEsType;
    this.callCluster = options.callCluster;
  }

  async getNewMappings() { }

  getNewIndex() {
    return `${this.indexName}.1`;
  }

  getBackupIndex() {
    return `${this.indexName}.backup`;
  }

  async rollback() {
    // Delete index
    const indexName = this.getNewIndex();

    await this.deleteIndex(indexName);
  }

  async applyChange() {
    const newIndexName = this.getNewIndex();
    const backupIndexName = this.getBackupIndex();
    const newMappings = await this.getNewMappings();

    // If there are no mapping changes, bail
    if (!newMappings) {
      return;
    }

    // Create the new index
    try {
      await this.createNewIndex(newIndexName, newMappings);
    }
    catch (e) {
      this.log(['error', 'elasticsearch'], {
        tmpl: `Unable to create new index ${newIndexName}`,
      });
      return;
    }

    // Perform a backup for safety!
    try {
      await this.reindex(this.indexName, backupIndexName);
    }
    catch (e) {
      this.log(['error', 'elasticsearch'], {
        tmpl: `Unable to reindex to ${backupIndexName}`,
      });
      await this.rollback();
      return;
    }

    // Reindex into the new index
    try {
      await this.reindex(this.indexName, newIndexName);
    }
    catch (e) {
      this.log(['error', 'elasticsearch'], {
        tmpl: `Unable to reindex to ${newIndexName}`,
      });
      await this.rollback();
      return;
    }

    // Delete existing .kibana index so we can alias into it
    try {
      await this.deleteIndex(this.indexName);
    }
    catch (e) {
      this.log(['error', 'elasticsearch'], {
        tmpl: `Unable to delete ${this.indexName}`,
      });
      await this.rollback();
      return;
    }

    try {
      await this.createAlias(newIndexName);
    }
    catch (e) {
      this.log(['error', 'elasticsearch'], {
        tmpl: `Unable to alias to ${newIndexName}`,
      });
      await this.rollback();
      return;
    }
  }

  async createAlias(newIndexName) {
    // log about new properties
    this.log(['info', 'elasticsearch'], {
      tmpl: `Aliasing ${newIndexName} to ${this.indexName}`,
    });

    // add the new properties to the index mapping
    await this.callCluster('indices.putAlias', {
      index: newIndexName,
      name: this.indexName,
    });
  }

  async reindex(source, dest) {
    // log about new properties
    this.log(['info', 'elasticsearch'], {
      tmpl: `Reindexing from ${source} to ${dest}`,
    });

    // add the new properties to the index mapping
    await this.callCluster('reindex', {
      body: {
        source: {
          index: source,
        },
        dest: {
          index: dest,
        }
      },
    });
  }

  async createNewIndex(indexName, newMappings) {
    // log about new properties
    this.log(['info', 'elasticsearch'], {
      tmpl: `Creating new .kibana index, named ${indexName}`,
    });

    // add the new properties to the index mapping
    await this.callCluster('indices.create', {
      index: indexName,
      body: {
        mappings: {
          doc: {
            properties: newMappings,
          }
        },
      },
    });
  }

  async deleteIndex(indexName) {
    // log about new properties
    this.log(['info', 'elasticsearch'], {
      tmpl: `Deleting index ${indexName}`,
    });

    // add the new properties to the index mapping
    await this.callCluster('indices.delete', {
      index: indexName
    });
  }
}
