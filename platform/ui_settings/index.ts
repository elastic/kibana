import { SavedObjectsService } from '../saved_objects';

export class UiSettingsService {
  private readonly esClient;
  private readonly savedObjectsService;
  private readonly _type;
  private readonly _id;

  constructor(server, request, options) {
    this.savedObjectsService = new SavedObjectsService(server, request);
    this._type = options.type;
    this._id = options.id;
  }

  async get(key: string) {
    await this.savedObjectsService.get(this._type, this._id)[key];
  }
}
