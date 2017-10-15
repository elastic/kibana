import { SavedObjectsService } from '../saved_objects';

export class UiSettingsService {
  private readonly esClient;
  private readonly savedObjectsService;
  private readonly _type;
  private readonly _id;

  constructor(request, savedObjectsService, options) {
    const savedObjectsClient = savedObjectsService.createClient('admin', request.headers);

    this._type = options.type;
    this._id = options.id;
  }

  async get(key: string) {
    await this.savedObjectsService.get(this._type, this._id)[key];
  }
}
