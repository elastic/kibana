-- wrk script for es_proxy_bench.sh: sends a POST with the body from BENCH_BODY.
-- Headers are passed on the wrk command line (-H).
wrk.method = "POST"
wrk.body = os.getenv("BENCH_BODY")
