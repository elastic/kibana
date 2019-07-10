import * as moment from "moment";
import HTTP from "../../../common/HTTP";
import LicenseExpiration from "../../../services/LicenseExpiration/LicenseExpiration";
import Notification from "../../../services/Notification/Notification";
import PasswordExpiration from "../../../services/PasswordExpiration/PasswordExpiration";
import ServerTime from "../../../services/ServerTime";

let HttpSingleton: HTTP | undefined = undefined;
const HttpService = HttpSingleton || (HttpSingleton = new HTTP());

let passwordExpirationSingleton: PasswordExpiration | undefined = undefined;
const passwordExpiration =
  passwordExpirationSingleton ||
  (passwordExpirationSingleton = new PasswordExpiration());

let serverTimeSingleton: ServerTime | undefined = undefined;
const serverTimeService =
  serverTimeSingleton || (serverTimeSingleton = new ServerTime());

const LICENSE_NOTIFICATION = {
  POLL_TIME_MS: 28800000, // 8 hours
  LOCAL_STORAGE_KEY: "license_notification_last_dismissed"
};

const PASSWORD_NOTIFICATION = {
  POLL_TIME_MS: 28800000, // 8 hours
  LOCAL_STORAGE_KEY: "password_notification_last_dismissed"
};

let licenseTimeout: number | undefined = undefined;

const dismissLicenseBanner = () => {
  licenseTimeout = window.setTimeout(() => {
    checkLicenseStatus();
  }, LICENSE_NOTIFICATION.POLL_TIME_MS);
};

export const checkLicenseStatus = () => {
  if (licenseTimeout) {
    clearTimeout(licenseTimeout);
  }
  HttpService.fetch("/api/licenses")
    .then(response => {
      response
        .json()
        .then(json => {
          if (response.ok && LicenseExpiration.shouldShowBanner(json)) {
            const bannerContent = LicenseExpiration.bannerContent(json);

            Notification.notify(
              "licenseExpiration",
              bannerContent.title,
              bannerContent.content,
              bannerContent.severity,
              dismissLicenseBanner
            );
          }
        })
        .catch(reject => {
          console.error("Unable to fetch license expiration status");
        });
    })
    .catch(reject => {
      console.error("Unable to fetch license status");
    });
};

let passwordTimeout: number | undefined = undefined;

const dismissPasswordBanner = () => {
  passwordTimeout = window.setTimeout(() => {
    checkPasswordStatus();
  }, PASSWORD_NOTIFICATION.POLL_TIME_MS);
};

export const checkPasswordStatus = () => {
  if (passwordTimeout) {
    clearTimeout(passwordTimeout);
  }
  HttpService.fetch("/api/me")
    .then(response => {
      response
        .json()
        .then(json => {
          if (response.ok) {
            passwordExpiration.getCurrentServerTime().then(body => {
              const timeUntilExpiredMs = passwordExpiration.getTimeUntilExpiration(
                json,
                body.timeMs
              );
              if (passwordExpiration.shouldShowBanner(timeUntilExpiredMs)) {
                const bannerContent = passwordExpiration.bannerContent(
                  json,
                  timeUntilExpiredMs
                );
                Notification.notify(
                  "passwordExpiration",
                  bannerContent.title,
                  bannerContent.content,
                  bannerContent.severity,
                  dismissPasswordBanner
                );
              }
            });
          }
        })
        .catch(reject => {
          console.error("Unable to fetch password status", reject);
        });
    })
    .catch(reject => {
      console.error("Unable to fetch password status", reject);
    });
};

export const checkTimeInSync = (isLicensed: boolean) => () => {
  const initialTime = moment();

  serverTimeService.fetchServerTime().then(response => {
    response.json().then(json => {
      if (response.status === 200) {
        const clientTime = moment();
        const serverTime = moment(json.timeMs);

        const clientServerTimeDiff = clientTime.diff(serverTime);
        const clientServerTimeDelta = Math.abs(clientServerTimeDiff);
        const clientServerTimeMargin = clientTime.diff(initialTime);
        const appendLinkToMessage = true;
        const timeMessage = serverTimeService.makeTimeMessageReact(
          clientServerTimeMargin,
          clientServerTimeDiff,
          appendLinkToMessage
        );
        const timeNSync = serverTimeService.nsync(clientServerTimeDelta);

        if (!timeNSync && isLicensed) {
          Notification.notify(
            "timeOutOfSync",
            "Time Out of Sync",
            timeMessage,
            "alert-danger",
            () => {}
          );
        }
      }
    });
  });
};
