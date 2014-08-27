<?php
//SET TIME LIMIT TO ZERO SO WE DONT TIMEOUT
set_time_limit(0);

// DEBUGGING
if (isset($_GET['debug'])){
	$debug = true;
}

// CHECK IF ALL IS SET
if (!isset($_GET['url']) || !isset($_GET['indices']) || !isset($_GET['export'])) {
	echo "You're missing something.. Are you sure you're supposed to be here?";
	exit(1);
}


// SET VARIABLES.. SOME FROM GETS.. CLEAN THIS UP LATER, PLEASE
$cleanURL = $_GET['url'];
$indices = $_GET['indices'];
$nowDate = new DateTime('NOW');
$nowDate = $nowDate->format('Y-m-d\TH:i:s\.000\Z');
$query = base64_decode($_GET['export']);

// GET SCROLL COUNT ID;
$url = $cleanURL."/".$indices."/_search?search_type=scan&scroll=5m&size=50";
$scroll_id = json_decode(getCurl($url,$query), true);
$fileName = "ESQuery".sha1(time());

//DEBUG STUFF
$getTotal = $scroll_id['hits']['total'];
if ($debug == true) {
	echo "Total :".$getTotal."<br>";
	echo "Url: ".$url."<br>";
	echo "FileName: ".$fileName."<br>";
	echo "Query: ".$query."<br>";
	exit(0);
}

// SET HEADERS SO IT DOWNLOADS... ALSO GET OUR TEMP FILE NAME AND USE THAT
header("Content-type: text/plain");
header("Content-Disposition: attachment; filename=".$fileName);

	// GETTEM ALL!
	$url = $cleanURL."/_search/scroll?scroll=10m";
	$query = $scroll_id['_scroll_id'];
	$doneTotal = 0;
	while ($getTotal > $doneTotal) {
		$callMessage = getCurl($url,$query);
		$jsonClean = json_decode($callMessage, true);
			foreach ($jsonClean['hits']['hits'] as $messages) {
					echo $messages['_source']['message']."\r\n";
					$doneTotal = $doneTotal + 1;
			}
	}

function getCurl($url,$query) {
	$ch = curl_init();
	$method = "GET";
	curl_setopt($ch, CURLOPT_URL, $url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
	curl_setopt($ch, CURLOPT_ENCODING , "");
	curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));
	if ($query != "") {
		curl_setopt($ch, CURLOPT_POSTFIELDS, $query);
	}
	curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
	curl_setopt($ch, CURLOPT_CONNECTTIMEOUT ,0);
	curl_setopt($ch, CURLOPT_TIMEOUT, 0);
	$result = curl_exec($ch);
	curl_close($ch);
	return $result;
}

?>
