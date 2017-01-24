import crypto from 'crypto';

const IV_LENGTH_IN_BYTES = 12;
const SALT_LENGTH_IN_BYTES = 64;
const KEY_LENGTH_IN_BYTES = 32;
const KEY_ITERATIONS = 10000;
const KEY_DIGEST = 'sha512';
const CIPHER_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_RESULT_ENCODING = 'base64';

function _validateOpts(opts) {
  if (!opts.encryptionKey) {
    throw new Error('encryptionKey is required');
  }
}

function _generateSalt() {
  return crypto.randomBytes(SALT_LENGTH_IN_BYTES);
}

function _generateIV() {
  return crypto.randomBytes(IV_LENGTH_IN_BYTES);
}

function _generateKey(encryptionKey, salt) {
  if (!Buffer.isBuffer(salt)) {
    salt = new Buffer(salt, ENCRYPTION_RESULT_ENCODING);
  }

  return new Promise((resolve, reject) => {
    crypto.pbkdf2(encryptionKey, salt, KEY_ITERATIONS, KEY_LENGTH_IN_BYTES, KEY_DIGEST, (err, key) => {
      if (err) {
        reject(err);
        return;
      }

      if (!Buffer.isBuffer(key)) {
        key = new Buffer(key, 'binary');
      }

      resolve(key);
    });
  });
}

function _serialize(obj) {
  return new Promise((resolve, reject) => {
    const serializedObj = JSON.stringify(obj);
    if (serializedObj === undefined) {
      reject(new Error('Object to be encrypted must be serializable'));
      return;
    }
    resolve(serializedObj);
  });
}

/**
 * Implmenetation of encrypt() and decrypt() taken from https://gist.github.com/AndiDittrich/4629e7db04819244e843,
 * which was recommended by @jaymode
 */
export default function makeCryptoWith(opts) {

  _validateOpts(opts);
  const encryptionKey = opts.encryptionKey;

  function encrypt(input) {
    const salt = _generateSalt();

    return Promise.all([
      _serialize(input),
      _generateIV(),
      _generateKey(encryptionKey, salt)
    ])
    .then(results => {
      const [ serializedInput, iv, key ] = results;
      const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, key, iv);

      const encrypted = Buffer.concat([cipher.update(serializedInput, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();

      return Buffer.concat([salt, iv, tag, encrypted]).toString(ENCRYPTION_RESULT_ENCODING);
    });
  }

  async function decrypt(output) {

    const outputBytes = new Buffer(output, ENCRYPTION_RESULT_ENCODING);

    const salt = outputBytes.slice(0, SALT_LENGTH_IN_BYTES);
    const iv = outputBytes.slice(SALT_LENGTH_IN_BYTES, SALT_LENGTH_IN_BYTES + IV_LENGTH_IN_BYTES);
    const tag = outputBytes.slice(SALT_LENGTH_IN_BYTES + IV_LENGTH_IN_BYTES, SALT_LENGTH_IN_BYTES + IV_LENGTH_IN_BYTES + 16); // Auth tag is always 16 bytes long
    const text = outputBytes.slice(SALT_LENGTH_IN_BYTES + IV_LENGTH_IN_BYTES + 16);

    const key = await _generateKey(encryptionKey, salt);
    const decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = decipher.update(text, 'binary', 'utf8') + decipher.final('utf8');
    return JSON.parse(decrypted);
  }

  return {
    encrypt,
    decrypt
  };
}
